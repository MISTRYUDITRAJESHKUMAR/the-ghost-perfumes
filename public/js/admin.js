/* ============================================================
   THE GHOST PERFUMES — Admin Panel JavaScript
   Handles auth gating, CRUD operations, real-time listeners,
   form handling, and UI interactions.
   ============================================================ */

(function () {
    'use strict';

    // ----------------------------------------------------------------
    // Globals & Firestore references (safe — works with or without Firebase)
    // ----------------------------------------------------------------
    const db   = (typeof GhostFirebase !== 'undefined' && GhostFirebase.db)   ? GhostFirebase.db   : null;
    const auth = (typeof GhostFirebase !== 'undefined' && GhostFirebase.auth) ? GhostFirebase.auth : null;

    const COLLECTIONS = {
        products: 'products',
        orders: 'orders',
        users: 'users',
    };

    // Admin email whitelist — STRICT, only these 3 can access
    const ADMIN_EMAILS = [
        'uditrmistry@gmail.com',
        'uditmistryrajeshkumar@gmail.com',
        'nayakaditya736@gmail.com'
    ];

    let currentUser = null;
    let currentPage = detectCurrentPage();
    let activeListeners = [];

    // ----------------------------------------------------------------
    // Page Detection
    // ----------------------------------------------------------------
    function detectCurrentPage() {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('add-product')) return 'add-product';
        if (path.includes('products')) return 'products';
        if (path.includes('orders')) return 'orders';
        return 'dashboard';
    }

    // ----------------------------------------------------------------
    // Admin Auth Gate
    // ----------------------------------------------------------------
    function checkAdminAuth() {
        // First, always check local storage (works in offline/local mode)
        const localUser = JSON.parse(localStorage.getItem('ghost_auth_user') || 'null');
        const localEmail = localUser && localUser.email ? localUser.email.trim().toLowerCase() : '';

        if (localUser && ADMIN_EMAILS.includes(localEmail)) {
            currentUser = localUser;
            onAdminReady(localUser);
            return;
        }

        // If Firebase is configured, also check Firebase Auth
        if (GhostFirebase && GhostFirebase.isConfigured() && auth) {
            auth.onAuthStateChanged(async (user) => {
                if (user && ADMIN_EMAILS.includes((user.email || '').toLowerCase())) {
                    currentUser = user;
                    onAdminReady(user);
                    return;
                }
                // Not an admin — redirect
                showToast('Admin clearance required.', 'error');
                setTimeout(() => { window.location.href = '../login.html'; }, 1000);
            });
        } else {
            // Local mode — no Firebase — not an admin
            showToast('Admin clearance required. Please log in.', 'error');
            setTimeout(() => { window.location.href = '../login.html'; }, 1000);
        }
    }

    async function verifyAdmin(user) {
        if (!user || !user.email) return false;
        // Strict whitelist only
        return ADMIN_EMAILS.includes(user.email.trim().toLowerCase());
    }

    function redirectToLogin() {
        window.location.href = '../index.html';
    }

    // ----------------------------------------------------------------
    // Admin Ready — Initialize page
    // ----------------------------------------------------------------
    function onAdminReady(user) {
        hideLoadingOverlay();
        updateAdminUI(user);
        initSidebar();
        initCurrentDate();

        switch (currentPage) {
            case 'dashboard':
                initDashboard();
                break;
            case 'products':
                initProductsPage();
                break;
            case 'add-product':
                initAddProductPage();
                break;
            case 'orders':
                initOrdersPage();
                break;
        }
    }

    function updateAdminUI(user) {
        const nameEls = document.querySelectorAll('#adminName, #welcomeName');
        const displayName = user.displayName || user.email.split('@')[0];
        nameEls.forEach((el) => {
            if (el) el.textContent = displayName;
        });
    }

    function hideLoadingOverlay() {
        const overlay = document.getElementById('adminLoadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            setTimeout(() => overlay.remove(), 500);
        }
    }

    function initCurrentDate() {
        const dateEl = document.getElementById('currentDate');
        if (dateEl) {
            const now = new Date();
            dateEl.textContent = now.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        }
    }

    // ----------------------------------------------------------------
    // Sidebar
    // ----------------------------------------------------------------
    function initSidebar() {
        const toggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('adminSidebar');
        const overlay = document.getElementById('sidebarOverlay');

        if (toggle && sidebar) {
            toggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
                if (overlay) overlay.classList.toggle('active');
            });
        }

        if (overlay) {
            overlay.addEventListener('click', () => {
                sidebar.classList.remove('open');
                overlay.classList.remove('active');
            });
        }

        // Active state
        const links = document.querySelectorAll('.sidebar-link[data-page]');
        links.forEach((link) => {
            link.classList.toggle('active', link.dataset.page === currentPage);
        });

        // Logout
        const logoutBtn = document.getElementById('adminLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('ghost_auth_user');
                try {
                    if (auth && typeof auth.signOut === 'function') {
                        auth.signOut().catch(() => {});
                    }
                } catch(_) {}
                window.location.href = '../index.html';
            });
        }
    }

    // ================================================================
    //  DASHBOARD
    // ================================================================
    function initDashboard() {
        fetchDashboardStats();
        listenRecentOrders();
        listenLowStock();
    }

    function fetchDashboardStats() {
        // Baseline from local cache
        const customProds = JSON.parse(localStorage.getItem('ghost_custom_products') || '[]');
        const totalProds = customProds.length;
        setStatValue('statTotalProducts', totalProds);

        const RTDB_URL = 'https://perfume-37ca2-default-rtdb.asia-southeast1.firebasedatabase.app';
        fetch(RTDB_URL + '/products.json')
            .then(r => r.json())
            .then(val => {
                const count = !val ? 0 : (Array.isArray(val) ? val.length : Object.keys(val).length);
                setStatValue('statTotalProducts', count);
            })
            .catch(() => {});

        const localOrders = JSON.parse(localStorage.getItem('ghost_orders') || '[]');
        setStatValue('statTotalOrders', localOrders.length || 0);
        const localRev = localOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        setStatValue('statRevenue', formatCurrency(localRev));
        setStatValue('statActiveUsers', 48);

        // Fetch live stats from Master Server
        fetch('/api/admin/stats', {
            headers: {
                'x-admin-key': 'ghost@123',
                'x-admin-email': currentUser ? currentUser.email : 'uditrmistry@gmail.com'
            }
        })
        .then(r => r.json())
        .then(data => {
            if (data.success && data.stats) {
                setStatValue('statTotalProducts', data.stats.totalProducts);
                setStatValue('statTotalOrders', data.stats.totalOrders);
                setStatValue('statRevenue', formatCurrency(data.stats.totalRevenue));
            }
        })
        .catch(() => {});

        try {
            // Products count (real-time)
            const unsubProducts = db.collection(COLLECTIONS.products).onSnapshot((snap) => {
                if (snap && snap.size > 0) setStatValue('statTotalProducts', snap.size);
            }, () => {});
            activeListeners.push(unsubProducts);

            // Orders count + revenue (real-time)
            const unsubOrders = db.collection(COLLECTIONS.orders).onSnapshot((snap) => {
                if (snap && snap.size > 0) {
                    setStatValue('statTotalOrders', snap.size);
                    let totalRevenue = 0;
                    snap.forEach((doc) => {
                        const data = doc.data();
                        totalRevenue += data.total || data.totalAmount || 0;
                    });
                    setStatValue('statRevenue', formatCurrency(totalRevenue));
                }
            }, () => {});
            activeListeners.push(unsubOrders);

            // Users count (real-time)
            const unsubUsers = db.collection(COLLECTIONS.users).onSnapshot((snap) => {
                if (snap && snap.size > 0) setStatValue('statActiveUsers', snap.size);
            }, () => {});
            activeListeners.push(unsubUsers);
        } catch(e) {
            console.warn('Offline stats active.');
        }
    }

    function listenRecentOrders() {
        const tbody = document.getElementById('recentOrdersBody');
        if (!tbody) return;

        const unsubRecent = db
            .collection(COLLECTIONS.orders)
            .orderBy('createdAt', 'desc')
            .limit(5)
            .onSnapshot((snap) => {
                if (snap.empty) {
                    tbody.innerHTML = `
                        <tr class="table-empty-row">
                            <td colspan="5">
                                <div class="table-empty">
                                    <i class="fas fa-inbox"></i>
                                    <p>No orders yet</p>
                                </div>
                            </td>
                        </tr>`;
                    return;
                }

                tbody.innerHTML = '';
                snap.forEach((doc) => {
                    const order = doc.data();
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td><span class="text-gold">#${doc.id.slice(-6).toUpperCase()}</span></td>
                        <td>${escapeHTML(order.customerName || order.userName || order.email || 'Guest')}</td>
                        <td>${formatDate(order.createdAt)}</td>
                        <td>${formatCurrency(order.total || order.totalAmount || 0)}</td>
                        <td><span class="status-badge status-badge--${order.status || 'pending'}">${order.status || 'pending'}</span></td>
                    `;
                    tbody.appendChild(row);
                });
            });
        activeListeners.push(unsubRecent);
    }

    function listenLowStock() {
        const container = document.getElementById('lowStockList');
        if (!container) return;

        const unsubLow = db
            .collection(COLLECTIONS.products)
            .where('stock', '<=', 10)
            .onSnapshot((snap) => {
                if (snap.empty) {
                    container.innerHTML = `
                        <div class="table-empty">
                            <i class="fas fa-check-circle"></i>
                            <p>All products are well-stocked</p>
                        </div>`;
                    return;
                }

                container.innerHTML = '';
                snap.forEach((doc) => {
                    const p = doc.data();
                    const item = document.createElement('div');
                    item.className = 'low-stock-item';
                    item.innerHTML = `
                        <span class="low-stock-item__name">${escapeHTML(p.name)}</span>
                        <span class="low-stock-item__stock">${p.stock} left</span>
                    `;
                    container.appendChild(item);
                });
            });
        activeListeners.push(unsubLow);
    }

    // ================================================================
    //  PRODUCTS PAGE
    // ================================================================
    let allProducts = [];

    function initProductsPage() {
        listenProducts();
        initProductFilters();
        initDeleteModal();
    }

    function listenProducts() {
        const tbody = document.getElementById('productsTableBody');
        const countBadge = document.getElementById('productsCount');
        if (!tbody) return;

        function getMergedProducts() {
            const custom = JSON.parse(localStorage.getItem('ghost_custom_products') || '[]');
            const deleted = JSON.parse(localStorage.getItem('ghost_deleted_products') || '[]');
            const legacyDummyIds = ['ghost-01','ghost-02','ghost-03','ghost-04','ghost-05','ghost-06','ghost-07'];
            const defs = (typeof GhostProducts !== 'undefined' && GhostProducts.getCached) ? GhostProducts.getCached() : [];
            const map = new Map();
            defs.forEach(p => {
                if (!deleted.includes(p.id) && !legacyDummyIds.includes(p.id)) {
                    map.set(p.id, { ...p, stock: p.stockQty || 12, image: p.thumbnail || p.images?.[0] });
                }
            });
            custom.forEach(p => {
                if (!deleted.includes(p.id) && !legacyDummyIds.includes(p.id)) {
                    map.set(p.id, p);
                }
            });
            const res = Array.from(map.values());
            if (res.length === 0) {
                try {
                    localStorage.removeItem('ghost_custom_products');
                    localStorage.removeItem('ghost_deleted_products');
                } catch (_) {}
            }
            return res;
        }

        function updateProductState(arr) {
            allProducts = Array.isArray(arr) ? arr : [];
            if (countBadge) countBadge.textContent = allProducts.length;
            renderProductsTable(allProducts);
            if (allProducts.length > 0) {
                localStorage.setItem('ghost_custom_products', JSON.stringify(allProducts));
            } else {
                localStorage.removeItem('ghost_custom_products');
                localStorage.removeItem('ghost_deleted_products');
            }
        }

        allProducts = getMergedProducts();
        if (countBadge) countBadge.textContent = allProducts.length;
        renderProductsTable(allProducts);

        const RTDB_URL = 'https://perfume-37ca2-default-rtdb.asia-southeast1.firebasedatabase.app';

        // 1. PRIMARY: Firebase Realtime Database Listener
        if (GhostFirebase && GhostFirebase.rtdb) {
            try {
                GhostFirebase.rtdb.ref('products').on('value', (snap) => {
                    const val = snap.val();
                    const arr = !val ? [] : (Array.isArray(val) ? val : Object.entries(val).map(([id, d]) => ({ id, ...d })));
                    updateProductState(arr);
                });
            } catch(e) {
                console.warn('[Admin] RTDB products listener notice:', e.message);
            }
        }

        // 2. Fetch fresh products from RTDB REST (works on Vercel)
        fetch(RTDB_URL + '/products.json')
            .then(res => res.json())
            .then(val => {
                const arr = !val ? [] : (Array.isArray(val) ? val : Object.entries(val).map(([id, d]) => ({ id, ...d })));
                updateProductState(arr);
            })
            .catch(() => {});

        // 3. Fallback to server API
        fetch('/api/products')
            .then(res => res.json())
            .then(data => {
                if (data.success && Array.isArray(data.products)) {
                    updateProductState(data.products);
                }
            })
            .catch(() => {});
    }

    function renderProductsTable(products) {
        const tbody = document.getElementById('productsTableBody');
        if (!tbody) return;

        if (products.length === 0) {
            tbody.innerHTML = `
                <tr class="table-empty-row">
                    <td colspan="7">
                        <div class="table-empty">
                            <i class="fas fa-box-open"></i>
                            <p>No products found</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = '';
        products.forEach((product) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <img src="${escapeHTML(product.image || product.imageUrl || '')}" 
                         alt="${escapeHTML(product.name)}" 
                         class="product-thumb"
                         onerror="this.src='https://via.placeholder.com/48x48/1a1a24/c9a84c?text=N/A'">
                </td>
                <td><strong>${escapeHTML(product.name)}</strong></td>
                <td><span class="text-muted" style="text-transform:capitalize;">${escapeHTML(product.category || '—')}</span></td>
                <td>${formatCurrency(product.price || 0)}</td>
                <td>
                    <span class="${(product.stock || 0) <= 10 ? 'text-danger' : ''}">${product.stock || 0}</span>
                </td>
                <td>
                    <span class="featured-badge featured-badge--${product.featured ? 'yes' : 'no'}">
                        <i class="fas fa-star"></i> ${product.featured ? 'Yes' : 'No'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <a href="add-product.html?id=${product.id}" class="table-action-btn" title="Edit">
                            <i class="fas fa-edit"></i>
                        </a>
                        <button class="table-action-btn table-action-btn--danger" title="Delete"
                                onclick="AdminApp.confirmDelete('${product.id}', '${escapeHTML(product.name).replace(/'/g, "\\'")}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    function initProductFilters() {
        // Category filter
        const filterBtns = document.querySelectorAll('#productCategoryFilter .filter-btn');
        filterBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                filterBtns.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                applyProductFilters();
            });
        });

        // Search
        const searchInput = document.getElementById('productSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(applyProductFilters, 300));
        }
    }

    function applyProductFilters() {
        const activeFilter = document.querySelector('#productCategoryFilter .filter-btn.active');
        const category = activeFilter ? activeFilter.dataset.category : 'all';
        const searchTerm = (document.getElementById('productSearchInput')?.value || '').toLowerCase();

        let filtered = allProducts;

        if (category !== 'all') {
            filtered = filtered.filter((p) => p.category === category);
        }

        if (searchTerm) {
            filtered = filtered.filter((p) => p.name.toLowerCase().includes(searchTerm));
        }

        renderProductsTable(filtered);
    }

    // Delete Modal
    let productToDelete = null;

    function initDeleteModal() {
        const modal = document.getElementById('deleteConfirmModal');
        const closeBtn = document.getElementById('closeDeleteModal');
        const cancelBtn = document.getElementById('cancelDeleteBtn');
        const confirmBtn = document.getElementById('confirmDeleteBtn');

        if (closeBtn) closeBtn.addEventListener('click', () => closeModal(modal));
        if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal(modal));

        if (confirmBtn) {
            confirmBtn.addEventListener('click', async () => {
                if (!productToDelete) return;
                confirmBtn.disabled = true;
                try {
                    // 1. PRIMARY: Delete from Firebase Realtime Database
                    const RTDB_URL = 'https://perfume-37ca2-default-rtdb.asia-southeast1.firebasedatabase.app';
                    try {
                        await fetch(RTDB_URL + '/products/' + encodeURIComponent(productToDelete) + '.json', {
                            method: 'DELETE'
                        });
                    } catch (_) {}

                    // 2. Delete from Server API
                    try {
                        await fetch('/api/admin/products/' + encodeURIComponent(productToDelete), {
                            method: 'DELETE',
                            headers: {
                                'x-admin-key': 'ghost@123',
                                'x-admin-email': currentUser ? currentUser.email : 'uditrmistry@gmail.com'
                            }
                        });
                    } catch (_) {}

                    // 3. Remove from local storage custom products
                    const custom = JSON.parse(localStorage.getItem('ghost_custom_products') || '[]');
                    const filtered = custom.filter(p => p.id !== productToDelete);
                    localStorage.setItem('ghost_custom_products', JSON.stringify(filtered));

                    // 4. Track deleted products so default catalog products are hidden
                    const deleted = JSON.parse(localStorage.getItem('ghost_deleted_products') || '[]');
                    if (!deleted.includes(productToDelete)) {
                        deleted.push(productToDelete);
                        localStorage.setItem('ghost_deleted_products', JSON.stringify(deleted));
                    }

                    showToast('✓ Perfume deleted from master vault successfully.', 'success');
                    // Refresh view
                    listenProducts();
                } catch (err) {
                    console.error('Delete error:', err);
                    showToast('Deleted from local registry.', 'info');
                    listenProducts();
                }
                confirmBtn.disabled = false;
                productToDelete = null;
                closeModal(modal);
            });
        }
    }

    function confirmDeleteProduct(productId, productName) {
        productToDelete = productId;
        const nameEl = document.getElementById('deleteProductName');
        if (nameEl) nameEl.textContent = productName;

        const modal = document.getElementById('deleteConfirmModal');
        openModal(modal);
    }

    // ================================================================
    //  ADD / EDIT PRODUCT PAGE
    // ================================================================
    function initAddProductPage() {
        initImagePreview();
        initProductForm();
        checkForEditMode();
    }

    let productGalleryImages = [];

    function renderAdminGallery() {
        const grid = document.getElementById('galleryPreviewGrid');
        const badge = document.getElementById('galleryCountBadge');
        const primaryInput = document.getElementById('productImage');
        if (!grid) return;

        // Sync primary cover input with first image if present
        if (productGalleryImages.length > 0 && primaryInput) {
            primaryInput.value = productGalleryImages[0];
        }

        if (badge) badge.textContent = productGalleryImages.length;

        if (productGalleryImages.length === 0) {
            grid.innerHTML = `
                <div style="grid-column:1/-1;text-align:center;color:var(--admin-text-dim);padding:1rem 0;" id="emptyGalleryNotice">
                    <i class="fas fa-images" style="font-size:1.8rem;margin-bottom:0.4rem;display:block;"></i>
                    <span>No photos added yet. Add URLs or upload photos above.</span>
                </div>`;
            return;
        }

        grid.innerHTML = productGalleryImages.map((url, idx) => `
            <div class="gallery-thumb-item ${idx === 0 ? 'is-cover' : ''}">
                <img src="${escapeHTML(url)}" alt="Photo ${idx + 1}" onerror="this.src='https://via.placeholder.com/80x80/1a1a24/d4af37?text=Error'">
                ${idx === 0 ? '<span class="gallery-thumb-badge">Cover</span>' : ''}
                <button type="button" class="gallery-thumb-remove" onclick="AdminApp.removeGalleryImage(${idx})" title="Remove photo">&times;</button>
                ${idx !== 0 ? `<button type="button" class="gallery-thumb-set-cover" onclick="AdminApp.setPrimaryImage(${idx})" title="Set as primary cover">Make Cover</button>` : ''}
            </div>
        `).join('');
    }

    function removeGalleryImage(index) {
        if (index >= 0 && index < productGalleryImages.length) {
            productGalleryImages.splice(index, 1);
            const primaryInput = document.getElementById('productImage');
            if (primaryInput) {
                primaryInput.value = productGalleryImages.length > 0 ? productGalleryImages[0] : '';
            }
            renderAdminGallery();
        }
    }

    function setPrimaryImage(index) {
        if (index > 0 && index < productGalleryImages.length) {
            const [selected] = productGalleryImages.splice(index, 1);
            productGalleryImages.unshift(selected);
            renderAdminGallery();
        }
    }

    function syncUrlsToGallery() {
        const primary = document.getElementById('productImage')?.value.trim();
        const inputs = document.querySelectorAll('.additional-img-url');
        const newUrls = [];
        if (primary) newUrls.push(primary);
        inputs.forEach(i => {
            const v = i.value.trim();
            if (v && !newUrls.includes(v)) newUrls.push(v);
        });
        // Keep any device data URLs that were uploaded
        productGalleryImages.forEach(img => {
            if (img.startsWith('data:') && !newUrls.includes(img)) {
                newUrls.push(img);
            }
        });
        productGalleryImages = newUrls;
        renderAdminGallery();
    }

        function compressImage(file, maxWidth = 1200, maxHeight = 1200, quality = 0.85) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    let { width, height } = img;
                    if (width > maxWidth || height > maxHeight) {
                        if (width > height) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        } else {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = () => resolve(event.target.result);
                img.src = event.target.result;
            };
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
        });
    }

    function initImagePreview() {
        const input = document.getElementById('productImage');
        const fileInput = document.getElementById('productImageFile');
        const addBtn = document.getElementById('addMoreUrlBtn');
        const container = document.getElementById('additionalUrlsContainer');

        if (input) {
            input.addEventListener('input', debounce(() => {
                const url = input.value.trim();
                if (url) {
                    if (productGalleryImages.length === 0) {
                        productGalleryImages.push(url);
                    } else {
                        productGalleryImages[0] = url;
                    }
                } else if (productGalleryImages.length > 0) {
                    productGalleryImages.shift();
                }
                renderAdminGallery();
            }, 300));
        }

        // Multi-file upload from device (auto-compressed to prevent payload size issues)
        if (fileInput) {
            fileInput.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;
                showToast(`Optimizing ${files.length} photo(s)... Please wait.`, 'info');
                let count = 0;
                for (const file of files) {
                    if (!file.type.startsWith('image/')) continue;
                    try {
                        const compressedDataUrl = await compressImage(file);
                        if (compressedDataUrl && !productGalleryImages.includes(compressedDataUrl)) {
                            productGalleryImages.push(compressedDataUrl);
                            count++;
                        }
                    } catch(err) {
                        console.error('Error compressing image:', err);
                    }
                }
                renderAdminGallery();
                showToast(`✓ ${count} photo(s) optimized & added to gallery!`, 'success');
            });
        }

        // Add additional URL row button
        if (addBtn && container) {
            addBtn.addEventListener('click', () => {
                const row = document.createElement('div');
                row.className = 'gallery-url-row';
                row.innerHTML = `
                    <input type="text" class="form-input form-input--sm additional-img-url" placeholder="https://..." style="padding:0.4rem 0.6rem;font-size:0.85rem;flex-grow:1;">
                    <button type="button" class="btn-admin btn-admin--danger btn-admin--sm" style="padding:0.35rem 0.6rem;" title="Remove">&times;</button>
                `;
                const inp = row.querySelector('input');
                const del = row.querySelector('button');

                inp.addEventListener('input', debounce(() => {
                    syncUrlsToGallery();
                }, 300));

                del.addEventListener('click', () => {
                    row.remove();
                    syncUrlsToGallery();
                });

                container.appendChild(row);
                inp.focus();
            });
        }
    }

    function initProductForm() {
        const form = document.getElementById('productForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!validateProductForm()) return;

            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            const originalText = document.getElementById('submitBtnText').textContent;
            document.getElementById('submitBtnText').textContent = 'Saving...';

            try {
                const productData = gatherProductData();
                const productId = document.getElementById('productId').value;
                const newId = productId || ('ghost-prod-' + Date.now());

                const savedObj = {
                    id: newId,
                    ...productData,
                    inStock: productData.stock > 0,
                    stockQty: productData.stock,
                    thumbnail: productData.image,
                    images: productData.images || [productData.image],
                    shortDesc: productData.description.slice(0, 100) + '...',
                    createdAt: Date.now()
                };

                // 1. PRIMARY: Save to Firebase Realtime Database (works on Vercel + all devices)
                const RTDB_URL = 'https://perfume-37ca2-default-rtdb.asia-southeast1.firebasedatabase.app';
                try {
                    await fetch(RTDB_URL + '/products/' + encodeURIComponent(newId) + '.json', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(savedObj)
                    });
                } catch(rtdbErr) {
                    console.warn('[Admin] RTDB save notice:', rtdbErr);
                }

                // 2. Also save to Server API (for local dev/backup)
                try {
                    await fetch('/api/admin/products', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-key': 'ghost@123',
                            'x-admin-email': currentUser ? currentUser.email : 'uditrmistry@gmail.com'
                        },
                        body: JSON.stringify(savedObj)
                    });
                } catch(apiErr) {
                    console.warn('[Admin] Server API update notice:', apiErr);
                }

                // 3. Save to local storage for instant sync across all tabs & storefront
                try {
                    const custom = JSON.parse(localStorage.getItem('ghost_custom_products') || '[]');
                    const existingIdx = custom.findIndex(p => p.id === newId);
                    if (existingIdx >= 0) {
                        custom[existingIdx] = savedObj;
                    } else {
                        custom.unshift(savedObj);
                    }
                    localStorage.setItem('ghost_custom_products', JSON.stringify(custom));

                    // Un-delete if this product was previously deleted
                    const deleted = JSON.parse(localStorage.getItem('ghost_deleted_products') || '[]');
                    const filteredDeleted = deleted.filter(id => id !== newId);
                    localStorage.setItem('ghost_deleted_products', JSON.stringify(filteredDeleted));
                } catch(e) {
                    console.warn('LocalStorage save warning:', e);
                }

                showToast(productId ? '✓ Perfume updated successfully in Master Vault!' : '✓ New fragrance added to vault & live on storefront!', 'success');
                
                if (productId) {
                    setTimeout(() => {
                        window.location.href = 'products.html';
                    }, 800);
                } else {
                    form.reset();
                    resetImagePreview();
                }
            } catch (err) {
                console.error('Save product error:', err);
                showToast('Failed to save product. Please try again.', 'error');
            }

            submitBtn.disabled = false;
            document.getElementById('submitBtnText').textContent = originalText;
        });

        // Reset button
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                clearFormErrors();
                resetImagePreview();
            });
        }
    }

    function gatherProductData() {
        const sizeSelect = document.getElementById('productSize');
        const selectedSizes = sizeSelect
            ? Array.from(sizeSelect.selectedOptions).map((o) => o.value)
            : [];

        const parseNotes = (id) => {
            const val = document.getElementById(id)?.value || '';
            return val
                .split(',')
                .map((n) => n.trim())
                .filter(Boolean);
        };

        const primaryVal = document.getElementById('productImage')?.value.trim() || '';
        let finalImages = Array.isArray(productGalleryImages) ? [...productGalleryImages] : [];
        if (primaryVal && !finalImages.includes(primaryVal)) {
            finalImages.unshift(primaryVal);
        }
        document.querySelectorAll('.additional-img-url').forEach(inp => {
            const v = inp.value.trim();
            if (v && !finalImages.includes(v)) {
                finalImages.push(v);
            }
        });
        const coverImg = finalImages[0] || primaryVal || 'https://images.unsplash.com/photo-1547887537-6158d64c35b3?w=800&q=80';

        return {
            name: document.getElementById('productName').value.trim(),
            description: document.getElementById('productDescription').value.trim(),
            price: parseFloat(document.getElementById('productPrice').value),
            stock: parseInt(document.getElementById('productStock').value, 10),
            category: document.getElementById('productCategory').value,
            sizes: selectedSizes,
            featured: document.getElementById('productFeatured').checked,
            image: coverImg,
            imageUrl: coverImg,
            thumbnail: coverImg,
            images: finalImages.length > 0 ? finalImages : [coverImg],
            notes: {
                top: parseNotes('topNotes'),
                middle: parseNotes('middleNotes'),
                base: parseNotes('baseNotes'),
            },
        };
    }

    function validateProductForm() {
        clearFormErrors();
        let valid = true;

        const name = document.getElementById('productName');
        if (!name.value.trim()) {
            setFieldError('nameError', 'Product name is required.');
            name.classList.add('error');
            valid = false;
        }

        const desc = document.getElementById('productDescription');
        if (!desc.value.trim()) {
            setFieldError('descError', 'Description is required.');
            desc.classList.add('error');
            valid = false;
        }

        const price = document.getElementById('productPrice');
        if (!price.value || parseFloat(price.value) <= 0) {
            setFieldError('priceError', 'Enter a valid price greater than 0.');
            price.classList.add('error');
            valid = false;
        }

        const stock = document.getElementById('productStock');
        if (stock.value === '' || parseInt(stock.value, 10) < 0) {
            setFieldError('stockError', 'Enter a valid stock quantity.');
            stock.classList.add('error');
            valid = false;
        }

        const category = document.getElementById('productCategory');
        if (!category.value) {
            setFieldError('categoryError', 'Please select a category.');
            category.classList.add('error');
            valid = false;
        }

        const image = document.getElementById('productImage');
        if (!image.value.trim()) {
            setFieldError('imageError', 'Image URL is required.');
            image.classList.add('error');
            valid = false;
        }

        return valid;
    }

    function setFieldError(id, msg) {
        const el = document.getElementById(id);
        if (el) el.textContent = msg;
    }

    function clearFormErrors() {
        document.querySelectorAll('.form-error').forEach((el) => (el.textContent = ''));
        document.querySelectorAll('.form-input.error').forEach((el) => el.classList.remove('error'));
    }

    function resetImagePreview() {
        productGalleryImages = [];
        const additionalContainer = document.getElementById('additionalUrlsContainer');
        if (additionalContainer) additionalContainer.innerHTML = '';
        const fileInput = document.getElementById('productImageFile');
        if (fileInput) fileInput.value = '';
        renderAdminGallery();
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.innerHTML = `<i class="fas fa-image"></i><p>Image preview will appear here</p>`;
            preview.classList.remove('has-image');
        }
    }

    // Edit Mode
    async function checkForEditMode() {
        const params = new URLSearchParams(window.location.search);
        const productId = params.get('id');
        if (!productId) return;

        // Switch to edit mode
        document.getElementById('productId').value = productId;
        document.getElementById('pageTitle').textContent = 'Edit Product';
        document.getElementById('submitBtnText').textContent = 'Update Product';

        try {
            let data = null;

            // Try Firestore if connected
            if (db && GhostFirebase && GhostFirebase.isConfigured()) {
                try {
                    const doc = await db.collection(COLLECTIONS.products).doc(productId).get();
                    if (doc.exists) data = doc.data();
                } catch(e) {
                    console.warn('Firestore doc read note:', e.message);
                }
            }

            // Fallback to local products or catalog
            if (!data) {
                const custom = JSON.parse(localStorage.getItem('ghost_custom_products') || '[]');
                data = custom.find(p => p.id === productId);
            }
            if (!data && typeof GhostProducts !== 'undefined') {
                data = await GhostProducts.fetchById(productId);
            }

            if (!data) {
                showToast('Product not found in registry.', 'error');
                return;
            }

            document.getElementById('productName').value = data.name || '';
            document.getElementById('productDescription').value = data.description || '';
            document.getElementById('productPrice').value = data.price || '';
            document.getElementById('productStock').value = data.stock ?? (data.stockQty ?? 10);
            document.getElementById('productCategory').value = data.category || '';
            document.getElementById('productFeatured').checked = data.featured || false;
            document.getElementById('productImage').value = data.image || data.imageUrl || data.thumbnail || '';

            // Populate multi-image gallery
            const imagesList = Array.isArray(data.images) && data.images.length > 0
                ? data.images
                : [data.image || data.imageUrl || data.thumbnail].filter(Boolean);

            productGalleryImages = [...imagesList];
            if (imagesList[0]) {
                document.getElementById('productImage').value = imagesList[0];
            }

            const additionalContainer = document.getElementById('additionalUrlsContainer');
            if (additionalContainer) {
                additionalContainer.innerHTML = '';
                for (let i = 1; i < imagesList.length; i++) {
                    const row = document.createElement('div');
                    row.className = 'gallery-url-row';
                    row.innerHTML = `
                        <input type="text" class="form-input form-input--sm additional-img-url" value="${escapeHTML(imagesList[i])}" style="padding:0.4rem 0.6rem;font-size:0.85rem;flex-grow:1;">
                        <button type="button" class="btn-admin btn-admin--danger btn-admin--sm" style="padding:0.35rem 0.6rem;" title="Remove">&times;</button>
                    `;
                    const inp = row.querySelector('input');
                    const del = row.querySelector('button');
                    inp.addEventListener('input', debounce(() => syncUrlsToGallery(), 300));
                    del.addEventListener('click', () => { row.remove(); syncUrlsToGallery(); });
                    additionalContainer.appendChild(row);
                }
            }
            renderAdminGallery();

            // Sizes
            const sizeSelect = document.getElementById('productSize');
            if (sizeSelect && data.sizes) {
                const sizeValues = Array.isArray(data.sizes) 
                    ? data.sizes.map(s => typeof s === 'object' ? (s.ml ? s.ml + 'ml' : s.label) : s)
                    : [];
                Array.from(sizeSelect.options).forEach((opt) => {
                    opt.selected = sizeValues.includes(opt.value);
                });
            }

            // Notes
            if (data.notes) {
                const top = Array.isArray(data.notes.top) ? data.notes.top.join(', ') : (data.notes.top || '');
                const middle = Array.isArray(data.notes.middle) ? data.notes.middle.join(', ') : (data.notes.middle || '');
                const base = Array.isArray(data.notes.base) ? data.notes.base.join(', ') : (data.notes.base || '');
                
                const topEl = document.getElementById('topNotes');
                const midEl = document.getElementById('middleNotes');
                const baseEl = document.getElementById('baseNotes');
                if (topEl) topEl.value = top;
                if (midEl) midEl.value = middle;
                if (baseEl) baseEl.value = base;
            }

            // Trigger image preview
            const imageInput = document.getElementById('productImage');
            if (imageInput) imageInput.dispatchEvent(new Event('input'));
        } catch (err) {
            console.error('Load product error:', err);
            showToast('Failed to load product data.', 'error');
        }
    }

    // ================================================================
    //  ORDERS PAGE
    // ================================================================
    let allOrders = [];

    function initOrdersPage() {
        listenOrders();
        initOrderFilters();
        initOrderDetailModal();
    }

    async function listenOrders() {
        const tbody = document.getElementById('ordersTableBody');
        const countBadge = document.getElementById('ordersCount');
        if (!tbody) return;

        function getLocalOrders() {
            try {
                return JSON.parse(localStorage.getItem('ghost_orders') || '[]');
            } catch(e) {
                return [];
            }
        }

        allOrders = getLocalOrders();
        if (countBadge) countBadge.textContent = allOrders.length;
        renderOrdersTable(allOrders);

        const RTDB_URL = 'https://perfume-37ca2-default-rtdb.asia-southeast1.firebasedatabase.app';

        // 1. PRIMARY: Realtime Database Listener for Orders
        if (GhostFirebase && GhostFirebase.rtdb) {
            try {
                GhostFirebase.rtdb.ref('orders').on('value', (snap) => {
                    const val = snap.val();
                    if (val) {
                        const arr = Array.isArray(val) ? val : Object.entries(val).map(([id, o]) => ({ id, orderId: id, ...o }));
                        if (arr.length > 0) {
                            allOrders = arr;
                            if (countBadge) countBadge.textContent = allOrders.length;
                            renderOrdersTable(allOrders);
                        }
                    }
                });
            } catch(e) {}
        }

        // 2. Fetch from RTDB REST (works on Vercel)
        fetch(RTDB_URL + '/orders.json')
            .then(res => res.json())
            .then(val => {
                if (val) {
                    const arr = Array.isArray(val) ? val : Object.entries(val).map(([id, o]) => ({ id, orderId: id, ...o }));
                    if (arr.length > 0) {
                        allOrders = arr;
                        if (countBadge) countBadge.textContent = allOrders.length;
                        renderOrdersTable(allOrders);
                    }
                }
            })
            .catch(() => {});

        // 3. Fetch from Master Server Store
        try {
            const res = await fetch('/api/admin/orders', {
                headers: {
                    'x-admin-key': 'ghost@123',
                    'x-admin-email': currentUser ? currentUser.email : 'uditrmistry@gmail.com'
                }
            });
            const data = await res.json();
            if (data.success && Array.isArray(data.orders) && data.orders.length > 0) {
                const map = new Map();
                data.orders.forEach(o => map.set(o.orderId || o.id, { id: o.orderId || o.id, ...o }));
                allOrders = Array.from(map.values());
                if (countBadge) countBadge.textContent = allOrders.length;
                renderOrdersTable(allOrders);
            }
        } catch(apiErr) {
            console.warn('[Admin] Server orders fetch note:', apiErr);
        }

        try {
            if (db && GhostFirebase && GhostFirebase.isConfigured()) {
                const unsubOrders = db
                    .collection(COLLECTIONS.orders)
                    .orderBy('createdAt', 'desc')
                    .onSnapshot((snap) => {
                        if (snap && !snap.empty) {
                            const map = new Map();
                            allOrders.forEach(o => map.set(o.id || o.orderId, o));
                            snap.forEach((doc) => {
                                map.set(doc.id, { id: doc.id, ...doc.data() });
                            });
                            allOrders = Array.from(map.values());
                            if (countBadge) countBadge.textContent = allOrders.length;
                            renderOrdersTable(allOrders);
                        }
                    }, (err) => {
                        console.warn('Orders sync deferred:', err.message);
                    });
                activeListeners.push(unsubOrders);
            }
        } catch(e) {
            console.warn('Offline orders active.');
        }
    }

    function renderOrdersTable(orders) {
        const tbody = document.getElementById('ordersTableBody');
        if (!tbody) return;

        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr class="table-empty-row">
                    <td colspan="7">
                        <div class="table-empty">
                            <i class="fas fa-inbox"></i>
                            <p>No orders found</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = '';
        orders.forEach((order) => {
            const itemCount = order.items ? order.items.length : (order.products ? order.products.length : 0);
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="text-gold">#${order.id.slice(-6).toUpperCase()}</span></td>
                <td>${escapeHTML(order.customerName || order.userName || order.email || 'Guest')}</td>
                <td>${formatDate(order.createdAt)}</td>
                <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
                <td><strong>${formatCurrency(order.total || order.totalAmount || 0)}</strong></td>
                <td><span class="status-badge status-badge--${order.status || 'pending'}">${order.status || 'pending'}</span></td>
                <td>
                    <div class="table-actions">
                        <button class="table-action-btn table-action-btn--view" title="View Details"
                                onclick="AdminApp.viewOrder('${order.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <select class="table-status-select" onchange="AdminApp.updateOrderStatus('${order.id}', this.value)" title="Update Status">
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        </select>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    function initOrderFilters() {
        // Status filter
        const filterBtns = document.querySelectorAll('#orderStatusFilter .filter-btn');
        filterBtns.forEach((btn) => {
            btn.addEventListener('click', () => {
                filterBtns.forEach((b) => b.classList.remove('active'));
                btn.classList.add('active');
                applyOrderFilters();
            });
        });

        // Search
        const searchInput = document.getElementById('orderSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', debounce(applyOrderFilters, 300));
        }
    }

    function applyOrderFilters() {
        const activeFilter = document.querySelector('#orderStatusFilter .filter-btn.active');
        const status = activeFilter ? activeFilter.dataset.status : 'all';
        const searchTerm = (document.getElementById('orderSearchInput')?.value || '').toLowerCase();

        let filtered = allOrders;

        if (status !== 'all') {
            filtered = filtered.filter((o) => o.status === status);
        }

        if (searchTerm) {
            filtered = filtered.filter((o) => {
                const orderId = o.id.toLowerCase();
                const name = (o.customerName || o.userName || o.email || '').toLowerCase();
                return orderId.includes(searchTerm) || name.includes(searchTerm);
            });
        }

        renderOrdersTable(filtered);
    }

    async function updateOrderStatus(orderId, newStatus) {
        try {
            // 1. Update in memory and local storage
            const idx = allOrders.findIndex(o => (o.id === orderId || o.orderId === orderId));
            if (idx >= 0) {
                allOrders[idx].status = newStatus;
                renderOrdersTable(allOrders);
            }
            try {
                const local = JSON.parse(localStorage.getItem('ghost_orders') || '[]');
                const lIdx = local.findIndex(o => (o.id === orderId || o.orderId === orderId));
                if (lIdx >= 0) {
                    local[lIdx].status = newStatus;
                    localStorage.setItem('ghost_orders', JSON.stringify(local));
                }
            } catch (_) {}

            // 2. Update via Master API & RTDB
            const RTDB_URL = 'https://perfume-37ca2-default-rtdb.asia-southeast1.firebasedatabase.app';
            try {
                fetch(RTDB_URL + '/orders/' + encodeURIComponent(orderId) + '/status.json', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newStatus)
                }).catch(() => {});

                await fetch(`/api/admin/orders/${orderId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-key': 'ghost@123',
                        'x-admin-email': currentUser ? currentUser.email : 'uditrmistry@gmail.com'
                    },
                    body: JSON.stringify({ status: newStatus })
                });
            } catch (apiErr) {
                console.warn('[Admin] Order status API update notice:', apiErr);
            }

            // 3. Sync to Firestore if available
            if (db && GhostFirebase && GhostFirebase.isConfigured()) {
                try {
                    await db.collection(COLLECTIONS.orders).doc(orderId).update({
                        status: newStatus,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    });
                } catch (_) {}
            }

            showToast(`Order status updated to "${newStatus}".`, 'success');
        } catch (err) {
            console.error('Update order status error:', err);
            showToast('Failed to update order status.', 'error');
        }
    }

    // Order Detail Modal
    let currentOrderId = null;

    function initOrderDetailModal() {
        const modal = document.getElementById('orderDetailModal');
        const closeBtn = document.getElementById('closeOrderModal');
        const updateBtn = document.getElementById('modalUpdateStatusBtn');

        if (closeBtn) closeBtn.addEventListener('click', () => closeModal(modal));

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeModal(modal);
            });
        }

        if (updateBtn) {
            updateBtn.addEventListener('click', async () => {
                if (!currentOrderId) return;
                const newStatus = document.getElementById('modalStatusSelect').value;
                await updateOrderStatus(currentOrderId, newStatus);
                closeModal(modal);
            });
        }
    }

    function viewOrderDetail(orderId) {
        const order = allOrders.find((o) => o.id === orderId);
        if (!order) {
            showToast('Order not found.', 'error');
            return;
        }

        currentOrderId = orderId;
        const content = document.getElementById('orderDetailContent');
        const statusSelect = document.getElementById('modalStatusSelect');

        if (statusSelect) statusSelect.value = order.status || 'pending';

        // Build items HTML
        const items = order.items || order.products || [];
        let itemsHTML = '';
        if (items.length > 0) {
            itemsHTML = `
                <ul class="order-items-list">
                    ${items
                        .map(
                            (item) => `
                        <li>
                            <span class="order-item-name">${escapeHTML(item.name || item.productName || 'Unknown Product')}</span>
                            <span class="order-item-qty">× ${item.quantity || item.qty || 1}</span>
                            <span class="order-item-price">${formatCurrency(item.price || 0)}</span>
                        </li>`
                        )
                        .join('')}
                </ul>`;
        } else {
            itemsHTML = '<p class="text-muted">No items data available.</p>';
        }

        // Build shipping address
        const address = order.shippingAddress || order.address || {};
        const addressStr = address.street
            ? `${address.street}, ${address.city || ''} ${address.state || ''} ${address.zip || ''}`
            : order.shippingAddress && typeof order.shippingAddress === 'string'
            ? order.shippingAddress
            : 'No address provided';

        content.innerHTML = `
            <div class="order-detail-grid">
                <div class="order-detail-section">
                    <div class="order-detail-label">Order ID</div>
                    <div class="order-detail-value text-gold">#${orderId.slice(-8).toUpperCase()}</div>
                </div>
                <div class="order-detail-section">
                    <div class="order-detail-label">Date</div>
                    <div class="order-detail-value">${formatDate(order.createdAt)}</div>
                </div>
                <div class="order-detail-section">
                    <div class="order-detail-label">Customer</div>
                    <div class="order-detail-value">${escapeHTML(order.customerName || order.userName || 'Guest')}</div>
                </div>
                <div class="order-detail-section">
                    <div class="order-detail-label">Email</div>
                    <div class="order-detail-value">${escapeHTML(order.email || '—')}</div>
                </div>
                <div class="order-detail-section">
                    <div class="order-detail-label">Phone</div>
                    <div class="order-detail-value">${escapeHTML(order.phone || '—')}</div>
                </div>
                <div class="order-detail-section">
                    <div class="order-detail-label">Status</div>
                    <div class="order-detail-value">
                        <span class="status-badge status-badge--${order.status || 'pending'}">${order.status || 'pending'}</span>
                    </div>
                </div>
            </div>

            <div class="order-detail-section mt-2">
                <div class="order-detail-label">Shipping Address</div>
                <div class="order-detail-value">${escapeHTML(addressStr)}</div>
            </div>

            <div class="order-detail-section mt-2">
                <div class="order-detail-label">Items</div>
                ${itemsHTML}
            </div>

            <div class="order-detail-section mt-2" style="text-align:right;">
                <div class="order-detail-label">Total</div>
                <div class="order-detail-value" style="font-size:1.3rem;color:var(--admin-primary);font-weight:700;">
                    ${formatCurrency(order.total || order.totalAmount || 0)}
                </div>
            </div>
        `;

        const modal = document.getElementById('orderDetailModal');
        openModal(modal);
    }

    // ================================================================
    //  MODALS — Helper
    // ================================================================
    function openModal(modal) {
        if (modal) modal.classList.add('active');
    }

    function closeModal(modal) {
        if (modal) modal.classList.remove('active');
    }

    // ================================================================
    //  TOAST NOTIFICATIONS
    // ================================================================
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle',
        };

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type] || icons.info} toast__icon"></i>
            <span class="toast__message">${escapeHTML(message)}</span>
            <button class="toast__close" onclick="this.parentElement.classList.add('toast-exit'); setTimeout(() => this.parentElement.remove(), 300);">
                <i class="fas fa-times"></i>
            </button>
        `;

        container.appendChild(toast);

        // Auto dismiss after 4 seconds
        setTimeout(() => {
            if (toast.parentElement) {
                toast.classList.add('toast-exit');
                setTimeout(() => toast.remove(), 300);
            }
        }, 4000);
    }

    // ================================================================
    //  UTILITY FUNCTIONS
    // ================================================================
    function formatCurrency(amount) {
        return '₹' + Number(amount || 0).toLocaleString('en-IN');
    }

    function formatDate(timestamp) {
        if (!timestamp) return '—';
        let date;
        if (timestamp.toDate) {
            date = timestamp.toDate();
        } else if (timestamp.seconds) {
            date = new Date(timestamp.seconds * 1000);
        } else {
            date = new Date(timestamp);
        }
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    }

    function escapeHTML(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function setStatValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    function debounce(fn, delay) {
        let timer;
        return function (...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    // ================================================================
    //  PUBLIC API (for inline event handlers)
    // ================================================================
    window.AdminApp = {
        confirmDelete: confirmDeleteProduct,
        viewOrder: viewOrderDetail,
        updateOrderStatus: updateOrderStatus,
    };

    // ================================================================
    //  INIT
    // ================================================================
    document.addEventListener('DOMContentLoaded', () => {
        checkAdminAuth();
    });

    // Cleanup listeners on page unload
    window.addEventListener('beforeunload', () => {
        activeListeners.forEach((unsub) => {
            if (typeof unsub === 'function') unsub();
        });
    });
})();
