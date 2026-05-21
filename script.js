const API_URL = "http://localhost:3000/api";

let productosOrden = [];
let serviciosOrden = [];
let detalleFactura = [];

document.addEventListener("DOMContentLoaded", () => {
    cargarUsuarioHeader();
    activarCerrarSesion();

    const pagina = obtenerPaginaActual();

    if (pagina !== "login.html" && pagina !== "crear_cuenta.html" && !obtenerToken()) {
        window.location.href = "login.html";
        return;
    }

    if (pagina === "login.html") iniciarLogin();
    if (pagina === "crear_cuenta.html") iniciarCrearCuenta();
    if (pagina === "dashboard.html") cargarDashboard();
    if (pagina === "clientes.html") iniciarClientes();
    if (pagina === "productos.html") iniciarProductos();
    if (pagina === "servicios.html") iniciarServicios();
    if (pagina === "ordenes.html") iniciarOrdenes();
    if (pagina === "facturacion.html") iniciarFacturacion();
    if (pagina === "pagos.html") iniciarPagos();
    if (pagina === "garantias.html") iniciarGarantias();
    if (pagina === "inventario.html") iniciarInventario();
    if (pagina === "reportes.html") iniciarReportes();
    if (pagina === "configuracion.html") iniciarConfiguracion();
});

function obtenerPaginaActual() {
    const ruta = window.location.pathname.split("/").pop();
    return ruta || "login.html";
}

function obtenerToken() {
    return localStorage.getItem("token");
}

function obtenerUsuario() {
    return JSON.parse(localStorage.getItem("usuario") || "{}");
}

async function apiFetch(ruta, opciones = {}) {
    const token = obtenerToken();

    const config = {
        ...opciones,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(opciones.headers || {})
        }
    };

    const respuesta = await fetch(`${API_URL}${ruta}`, config);
    const datos = await respuesta.json();

    if (!respuesta.ok) {
        throw new Error(datos.mensaje || "Error en la petición");
    }

    return datos;
}

function mostrarMensaje(id, texto, tipo = "ok") {
    const elemento = document.getElementById(id);
    if (!elemento) return;

    elemento.textContent = texto;
    elemento.className = `mensaje ${tipo}`;

    setTimeout(() => {
        elemento.textContent = "";
        elemento.className = "mensaje";
    }, 4000);
}

function formatoDinero(valor) {
    return `$${Number(valor || 0).toFixed(2)}`;
}

function formatoFecha(fecha) {
    if (!fecha) return "";
    return new Date(fecha).toLocaleString("es-EC");
}

function estadoClase(estado) {
    if (!estado) return "";

    return estado
        .toLowerCase()
        .replaceAll(" ", "")
        .replaceAll("á", "a")
        .replaceAll("é", "e")
        .replaceAll("í", "i")
        .replaceAll("ó", "o")
        .replaceAll("ú", "u")
        .replace("enrevision", "revision")
        .replace("enreparacion", "reparacion");
}

function limpiarTextoImpresion(valor) {
    return String(valor ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function cargarUsuarioHeader() {
    const usuario = obtenerUsuario();
    const nombreUsuario = document.getElementById("nombreUsuario");
    const rolUsuario = document.getElementById("rolUsuario");

    if (nombreUsuario && usuario.nombre) {
        nombreUsuario.textContent = `${usuario.nombre} ${usuario.apellido || ""}`;
    }

    if (rolUsuario && usuario.rol) {
        rolUsuario.textContent = usuario.rol;
    }
}

function activarCerrarSesion() {
    const btn = document.getElementById("btnCerrarSesion");

    if (!btn) return;

    btn.addEventListener("click", () => {
        localStorage.removeItem("token");
        localStorage.removeItem("usuario");
        window.location.href = "login.html";
    });
}

function iniciarLogin() {
    const form = document.getElementById("formLogin");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const correo = document.getElementById("correo").value.trim();
        const contraseña = document.getElementById("contraseña").value.trim();

        try {
            const datos = await apiFetch("/login", {
                method: "POST",
                body: JSON.stringify({ correo, contraseña })
            });

            localStorage.setItem("token", datos.token);
            localStorage.setItem("usuario", JSON.stringify(datos.usuario));

            mostrarMensaje("mensajeLogin", "Inicio de sesión correcto", "ok");

            setTimeout(() => {
                window.location.href = "dashboard.html";
            }, 700);

        } catch (error) {
            mostrarMensaje("mensajeLogin", error.message, "error");
        }
    });
}

function iniciarCrearCuenta() {
    const form = document.getElementById("formCrearCuenta");

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const datosCuenta = {
            cedula: document.getElementById("cedula").value.trim(),
            nombre: document.getElementById("nombre").value.trim(),
            apellido: document.getElementById("apellido").value.trim(),
            telefono: document.getElementById("telefono").value.trim(),
            correo: document.getElementById("correo").value.trim(),
            contraseña: document.getElementById("contraseña").value.trim()
        };

        if (datosCuenta.contraseña.length < 8) {
            mostrarMensaje("mensajeCrearCuenta", "La contraseña debe tener mínimo 8 caracteres", "error");
            return;
        }

        try {
            await apiFetch("/crear-cuenta", {
                method: "POST",
                body: JSON.stringify(datosCuenta)
            });

            mostrarMensaje("mensajeCrearCuenta", "Cuenta creada correctamente", "ok");
            form.reset();

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1200);

        } catch (error) {
            mostrarMensaje("mensajeCrearCuenta", error.message, "error");
        }
    });
}

async function cargarDashboard() {
    try {
        const respuesta = await apiFetch("/dashboard");
        const d = respuesta.datos;

        document.getElementById("ventasDia").textContent = formatoDinero(d.ventas_dia);
        document.getElementById("serviciosPendientes").textContent = d.servicios_pendientes;
        document.getElementById("clientesRegistrados").textContent = d.clientes_registrados;
        document.getElementById("productosStock").textContent = d.productos_stock;
        document.getElementById("facturasEmitidas").textContent = d.facturas_emitidas;
        document.getElementById("productosBajoStock").textContent = d.productos_bajo_stock;
        document.getElementById("ordenesReparacion").textContent = d.ordenes_reparacion;
        document.getElementById("gananciasAproximadas").textContent = formatoDinero(d.ganancias_aproximadas);

    } catch (error) {
        console.error(error.message);
    }
}

function iniciarClientes() {
    cargarClientes();

    document.getElementById("formCliente").addEventListener("submit", guardarCliente);
    document.getElementById("btnBuscarCliente").addEventListener("click", () => {
        cargarClientes(document.getElementById("buscarCliente").value);
    });
    document.getElementById("btnLimpiarCliente").addEventListener("click", limpiarCliente);
}

async function cargarClientes(buscar = "") {
    try {
        const respuesta = await apiFetch(`/clientes?buscar=${encodeURIComponent(buscar)}`);
        const tabla = document.getElementById("tablaClientes");

        if (respuesta.datos.length === 0) {
            tabla.innerHTML = `<tr><td colspan="7">No hay clientes registrados</td></tr>`;
            return;
        }

        tabla.innerHTML = respuesta.datos.map(c => `
            <tr>
                <td>${c.id_cliente}</td>
                <td>${c.identificacion}</td>
                <td>${c.nombres}</td>
                <td>${c.telefono || ""}</td>
                <td>${c.correo || ""}</td>
                <td><span class="estado ${estadoClase(c.estado)}">${c.estado}</span></td>
                <td>
                    <button class="btn-tabla btn-editar" onclick='editarCliente(${JSON.stringify(c)})'>Editar</button>
                    <button class="btn-tabla btn-eliminar" onclick="eliminarCliente(${c.id_cliente})">Eliminar</button>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        mostrarMensaje("mensajeCliente", error.message, "error");
    }
}

async function guardarCliente(e) {
    e.preventDefault();

    const id = document.getElementById("id_cliente").value;

    const cliente = {
        tipo_identificacion: document.getElementById("tipo_identificacion").value,
        identificacion: document.getElementById("identificacion").value.trim(),
        nombres: document.getElementById("nombres").value.trim(),
        telefono: document.getElementById("telefono").value.trim(),
        correo: document.getElementById("correo").value.trim(),
        direccion: document.getElementById("direccion").value.trim(),
        estado: document.getElementById("estado").value
    };

    try {
        if (id) {
            await apiFetch(`/clientes/${id}`, {
                method: "PUT",
                body: JSON.stringify(cliente)
            });
            mostrarMensaje("mensajeCliente", "Cliente actualizado correctamente", "ok");
        } else {
            await apiFetch("/clientes", {
                method: "POST",
                body: JSON.stringify(cliente)
            });
            mostrarMensaje("mensajeCliente", "Cliente registrado correctamente", "ok");
        }

        limpiarCliente();
        cargarClientes();

    } catch (error) {
        mostrarMensaje("mensajeCliente", error.message, "error");
    }
}

function editarCliente(c) {
    document.getElementById("id_cliente").value = c.id_cliente;
    document.getElementById("tipo_identificacion").value = c.tipo_identificacion;
    document.getElementById("identificacion").value = c.identificacion;
    document.getElementById("nombres").value = c.nombres;
    document.getElementById("telefono").value = c.telefono || "";
    document.getElementById("correo").value = c.correo || "";
    document.getElementById("direccion").value = c.direccion || "";
    document.getElementById("estado").value = c.estado;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function eliminarCliente(id) {
    if (!confirm("¿Deseas desactivar este cliente?")) return;

    try {
        await apiFetch(`/clientes/${id}`, { method: "DELETE" });
        cargarClientes();
    } catch (error) {
        alert(error.message);
    }
}

function limpiarCliente() {
    document.getElementById("formCliente").reset();
    document.getElementById("id_cliente").value = "";
}

function iniciarProductos() {
    cargarProductos();

    document.getElementById("formProducto").addEventListener("submit", guardarProducto);
    document.getElementById("btnBuscarProducto").addEventListener("click", () => {
        cargarProductos(document.getElementById("buscarProducto").value);
    });
    document.getElementById("btnLimpiarProducto").addEventListener("click", limpiarProducto);
}

async function cargarProductos(buscar = "") {
    try {
        const respuesta = await apiFetch(`/productos?buscar=${encodeURIComponent(buscar)}`);
        const tabla = document.getElementById("tablaProductos");

        if (respuesta.datos.length === 0) {
            tabla.innerHTML = `<tr><td colspan="8">No hay productos registrados</td></tr>`;
            return;
        }

        tabla.innerHTML = respuesta.datos.map(p => `
            <tr>
                <td>${p.codigo}</td>
                <td>${p.nombre}</td>
                <td>${p.categoria || ""}</td>
                <td>${formatoDinero(p.precio_compra)}</td>
                <td>${formatoDinero(p.precio_venta)}</td>
                <td>${p.stock <= p.stock_minimo ? "⚠️ " : ""}${p.stock}</td>
                <td><span class="estado ${estadoClase(p.estado)}">${p.estado}</span></td>
                <td>
                    <button class="btn-tabla btn-editar" onclick='editarProducto(${JSON.stringify(p)})'>Editar</button>
                    <button class="btn-tabla btn-eliminar" onclick="eliminarProducto(${p.id_producto})">Eliminar</button>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        mostrarMensaje("mensajeProducto", error.message, "error");
    }
}

async function guardarProducto(e) {
    e.preventDefault();

    const id = document.getElementById("id_producto").value;

    const producto = {
        codigo: document.getElementById("codigo").value.trim(),
        nombre: document.getElementById("nombre").value.trim(),
        marca: document.getElementById("marca").value.trim(),
        modelo: document.getElementById("modelo").value.trim(),
        categoria: document.getElementById("categoria").value.trim(),
        descripcion: document.getElementById("descripcion").value.trim(),
        precio_compra: Number(document.getElementById("precio_compra").value || 0),
        precio_venta: Number(document.getElementById("precio_venta").value || 0),
        stock: Number(document.getElementById("stock").value || 0),
        stock_minimo: Number(document.getElementById("stock_minimo").value || 0),
        iva: Number(document.getElementById("iva").value || 0),
        estado: document.getElementById("estado").value
    };

    try {
        if (id) {
            await apiFetch(`/productos/${id}`, {
                method: "PUT",
                body: JSON.stringify(producto)
            });
            mostrarMensaje("mensajeProducto", "Producto actualizado correctamente", "ok");
        } else {
            await apiFetch("/productos", {
                method: "POST",
                body: JSON.stringify(producto)
            });
            mostrarMensaje("mensajeProducto", "Producto registrado correctamente", "ok");
        }

        limpiarProducto();
        cargarProductos();

    } catch (error) {
        mostrarMensaje("mensajeProducto", error.message, "error");
    }
}

function editarProducto(p) {
    document.getElementById("id_producto").value = p.id_producto;
    document.getElementById("codigo").value = p.codigo;
    document.getElementById("nombre").value = p.nombre;
    document.getElementById("marca").value = p.marca || "";
    document.getElementById("modelo").value = p.modelo || "";
    document.getElementById("categoria").value = p.categoria || "";
    document.getElementById("descripcion").value = p.descripcion || "";
    document.getElementById("precio_compra").value = p.precio_compra;
    document.getElementById("precio_venta").value = p.precio_venta;
    document.getElementById("stock").value = p.stock;
    document.getElementById("stock_minimo").value = p.stock_minimo;
    document.getElementById("iva").value = p.iva;
    document.getElementById("estado").value = p.estado;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function eliminarProducto(id) {
    if (!confirm("¿Deseas desactivar este producto?")) return;

    try {
        await apiFetch(`/productos/${id}`, { method: "DELETE" });
        cargarProductos();
    } catch (error) {
        alert(error.message);
    }
}

function limpiarProducto() {
    document.getElementById("formProducto").reset();
    document.getElementById("id_producto").value = "";
}

function iniciarServicios() {
    cargarServicios();

    document.getElementById("formServicio").addEventListener("submit", guardarServicio);
    document.getElementById("btnBuscarServicio").addEventListener("click", () => {
        cargarServicios(document.getElementById("buscarServicio").value);
    });
    document.getElementById("btnLimpiarServicio").addEventListener("click", limpiarServicio);
}

async function cargarServicios(buscar = "") {
    try {
        const respuesta = await apiFetch(`/servicios?buscar=${encodeURIComponent(buscar)}`);
        const tabla = document.getElementById("tablaServicios");

        if (respuesta.datos.length === 0) {
            tabla.innerHTML = `<tr><td colspan="7">No hay servicios registrados</td></tr>`;
            return;
        }

        tabla.innerHTML = respuesta.datos.map(s => `
            <tr>
                <td>${s.id_servicio}</td>
                <td>${s.nombre}</td>
                <td>${formatoDinero(s.precio)}</td>
                <td>${s.tiempo_estimado || ""}</td>
                <td>${s.garantia_dias} días</td>
                <td><span class="estado ${estadoClase(s.estado)}">${s.estado}</span></td>
                <td>
                    <button class="btn-tabla btn-editar" onclick='editarServicio(${JSON.stringify(s)})'>Editar</button>
                    <button class="btn-tabla btn-eliminar" onclick="eliminarServicio(${s.id_servicio})">Eliminar</button>
                </td>
            </tr>
        `).join("");

    } catch (error) {
        mostrarMensaje("mensajeServicio", error.message, "error");
    }
}

async function guardarServicio(e) {
    e.preventDefault();

    const id = document.getElementById("id_servicio").value;

    const servicio = {
        nombre: document.getElementById("nombre").value.trim(),
        descripcion: document.getElementById("descripcion").value.trim(),
        precio: Number(document.getElementById("precio").value || 0),
        tiempo_estimado: document.getElementById("tiempo_estimado").value.trim(),
        garantia_dias: Number(document.getElementById("garantia_dias").value || 0),
        estado: document.getElementById("estado").value
    };

    try {
        if (id) {
            await apiFetch(`/servicios/${id}`, {
                method: "PUT",
                body: JSON.stringify(servicio)
            });
            mostrarMensaje("mensajeServicio", "Servicio actualizado correctamente", "ok");
        } else {
            await apiFetch("/servicios", {
                method: "POST",
                body: JSON.stringify(servicio)
            });
            mostrarMensaje("mensajeServicio", "Servicio registrado correctamente", "ok");
        }

        limpiarServicio();
        cargarServicios();

    } catch (error) {
        mostrarMensaje("mensajeServicio", error.message, "error");
    }
}

function editarServicio(s) {
    document.getElementById("id_servicio").value = s.id_servicio;
    document.getElementById("nombre").value = s.nombre;
    document.getElementById("descripcion").value = s.descripcion || "";
    document.getElementById("precio").value = s.precio;
    document.getElementById("tiempo_estimado").value = s.tiempo_estimado || "";
    document.getElementById("garantia_dias").value = s.garantia_dias;
    document.getElementById("estado").value = s.estado;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function eliminarServicio(id) {
    if (!confirm("¿Deseas desactivar este servicio?")) return;

    try {
        await apiFetch(`/servicios/${id}`, { method: "DELETE" });
        cargarServicios();
    } catch (error) {
        alert(error.message);
    }
}

function limpiarServicio() {
    document.getElementById("formServicio").reset();
    document.getElementById("id_servicio").value = "";
}

async function llenarSelectClientes(idSelect = "id_cliente") {
    const select = document.getElementById(idSelect);
    if (!select) return;

    const respuesta = await apiFetch("/select/clientes");

    select.innerHTML = `<option value="">Seleccione cliente</option>`;
    respuesta.datos.forEach(c => {
        select.innerHTML += `<option value="${c.id_cliente}">${c.nombres} - ${c.identificacion}</option>`;
    });
}

async function llenarSelectProductos(idSelect) {
    const select = document.getElementById(idSelect);
    if (!select) return;

    const respuesta = await apiFetch("/select/productos");

    select.innerHTML = `<option value="">Seleccione producto</option>`;
    respuesta.datos.forEach(p => {
        select.innerHTML += `<option value="${p.id_producto}" data-nombre="${p.nombre}" data-precio="${p.precio_venta}" data-stock="${p.stock}" data-iva="${p.iva}">${p.codigo} - ${p.nombre} | Stock: ${p.stock}</option>`;
    });
}

async function llenarSelectServicios(idSelect) {
    const select = document.getElementById(idSelect);
    if (!select) return;

    const respuesta = await apiFetch("/select/servicios");

    select.innerHTML = `<option value="">Seleccione servicio</option>`;
    respuesta.datos.forEach(s => {
        select.innerHTML += `<option value="${s.id_servicio}" data-nombre="${s.nombre}" data-precio="${s.precio}">${s.nombre} - ${formatoDinero(s.precio)}</option>`;
    });
}

async function llenarSelectTecnicos() {
    const select = document.getElementById("id_tecnico");
    if (!select) return;

    const respuesta = await apiFetch("/select/tecnicos");

    select.innerHTML = `<option value="">Seleccione técnico</option>`;
    respuesta.datos.forEach(t => {
        select.innerHTML += `<option value="${t.id_usuario}">${t.tecnico}</option>`;
    });
}

function iniciarOrdenes() {
    llenarSelectClientes("id_cliente");
    llenarSelectTecnicos();
    llenarSelectProductos("selectProductoOrden");
    llenarSelectServicios("selectServicioOrden");
    cargarOrdenes();

    document.getElementById("btnAgregarProductoOrden").addEventListener("click", agregarProductoOrden);
    document.getElementById("btnAgregarServicioOrden").addEventListener("click", agregarServicioOrden);
    document.getElementById("formOrden").addEventListener("submit", guardarOrden);
    document.getElementById("btnBuscarOrden").addEventListener("click", () => {
        cargarOrdenes(document.getElementById("buscarOrden").value);
    });
    document.getElementById("btnLimpiarOrden").addEventListener("click", limpiarOrden);
    document.getElementById("btnImprimirOrden").addEventListener("click", imprimirComprobanteOrden);
}

function agregarProductoOrden() {
    const select = document.getElementById("selectProductoOrden");
    const option = select.options[select.selectedIndex];
    const cantidad = Number(document.getElementById("cantidadProductoOrden").value || 1);

    if (!select.value) return alert("Seleccione un producto");

    const precio = Number(option.dataset.precio || 0);

    productosOrden.push({
        id_producto: Number(select.value),
        nombre: option.dataset.nombre,
        cantidad,
        precio_unitario: precio,
        subtotal: cantidad * precio
    });

    renderProductosOrden();
}

function renderProductosOrden() {
    const tabla = document.getElementById("tablaProductosOrden");

    if (productosOrden.length === 0) {
        tabla.innerHTML = `<tr><td colspan="5">Sin productos agregados</td></tr>`;
    } else {
        tabla.innerHTML = productosOrden.map((p, i) => `
            <tr>
                <td>${p.nombre}</td>
                <td>${p.cantidad}</td>
                <td>${formatoDinero(p.precio_unitario)}</td>
                <td>${formatoDinero(p.subtotal)}</td>
                <td><button type="button" class="btn-tabla btn-eliminar" onclick="quitarProductoOrden(${i})">X</button></td>
            </tr>
        `).join("");
    }

    calcularTotalOrden();
}

function quitarProductoOrden(i) {
    productosOrden.splice(i, 1);
    renderProductosOrden();
}

function agregarServicioOrden() {
    const select = document.getElementById("selectServicioOrden");
    const option = select.options[select.selectedIndex];

    if (!select.value) return alert("Seleccione un servicio");

    const precio = Number(option.dataset.precio || 0);

    serviciosOrden.push({
        id_servicio: Number(select.value),
        nombre: option.dataset.nombre,
        precio,
        subtotal: precio
    });

    renderServiciosOrden();
}

function renderServiciosOrden() {
    const tabla = document.getElementById("tablaServiciosOrden");

    if (serviciosOrden.length === 0) {
        tabla.innerHTML = `<tr><td colspan="4">Sin servicios agregados</td></tr>`;
    } else {
        tabla.innerHTML = serviciosOrden.map((s, i) => `
            <tr>
                <td>${s.nombre}</td>
                <td>${formatoDinero(s.precio)}</td>
                <td>${formatoDinero(s.subtotal)}</td>
                <td><button type="button" class="btn-tabla btn-eliminar" onclick="quitarServicioOrden(${i})">X</button></td>
            </tr>
        `).join("");
    }

    calcularTotalOrden();
}

function quitarServicioOrden(i) {
    serviciosOrden.splice(i, 1);
    renderServiciosOrden();
}

function calcularTotalOrden() {
    const totalProductos = productosOrden.reduce((acc, p) => acc + p.subtotal, 0);
    const totalServicios = serviciosOrden.reduce((acc, s) => acc + s.subtotal, 0);
    document.getElementById("totalOrden").textContent = formatoDinero(totalProductos + totalServicios);
}

async function guardarOrden(e) {
    e.preventDefault();

    const orden = {
        id_cliente: document.getElementById("id_cliente").value,
        id_tecnico: document.getElementById("id_tecnico").value || null,
        equipo: document.getElementById("equipo").value.trim(),
        marca: document.getElementById("marca").value.trim(),
        modelo: document.getElementById("modelo").value.trim(),
        numero_serie: document.getElementById("numero_serie").value.trim(),
        accesorios_recibidos: document.getElementById("accesorios_recibidos").value.trim(),
        problema_reportado: document.getElementById("problema_reportado").value.trim(),
        diagnostico: document.getElementById("diagnostico").value.trim(),
        solucion: document.getElementById("solucion").value.trim(),
        observaciones: document.getElementById("observaciones").value.trim(),
        fecha_entrega: document.getElementById("fecha_entrega").value || null,
        estado: document.getElementById("estado").value,
        productos: productosOrden,
        servicios: serviciosOrden
    };

    try {
        await apiFetch("/ordenes", {
            method: "POST",
            body: JSON.stringify(orden)
        });

        mostrarMensaje("mensajeOrden", "Orden registrada correctamente", "ok");
        limpiarOrden();
        cargarOrdenes();

    } catch (error) {
        mostrarMensaje("mensajeOrden", error.message, "error");
    }
}

async function cargarOrdenes(buscar = "") {
    try {
        const respuesta = await apiFetch(`/ordenes?buscar=${encodeURIComponent(buscar)}`);
        const tabla = document.getElementById("tablaOrdenes");

        if (respuesta.datos.length === 0) {
            tabla.innerHTML = `<tr><td colspan="8">No hay órdenes registradas</td></tr>`;
            return;
        }

        tabla.innerHTML = respuesta.datos.map(o => {
            const dataOrden = encodeURIComponent(JSON.stringify(o));

            return `
                <tr>
                    <td>${o.numero_orden}</td>
                    <td>${o.cliente}</td>
                    <td>${o.tecnico || "Sin asignar"}</td>
                    <td>${o.equipo}</td>
                    <td><span class="estado ${estadoClase(o.estado)}">${o.estado}</span></td>
                    <td>${formatoDinero(o.total_estimado)}</td>
                    <td>${formatoFecha(o.fecha_ingreso)}</td>
                    <td>
                        <button class="btn-tabla btn-imprimir" onclick="imprimirOrdenTablaDesdeData('${dataOrden}')">Imprimir</button>
                    </td>
                </tr>
            `;
        }).join("");

    } catch (error) {
        mostrarMensaje("mensajeOrden", error.message, "error");
    }
}

function limpiarOrden() {
    document.getElementById("formOrden").reset();
    productosOrden = [];
    serviciosOrden = [];
    renderProductosOrden();
    renderServiciosOrden();
}

function iniciarFacturacion() {
    llenarSelectClientes("id_cliente");
    llenarSelectProductos("selectProductoFactura");
    llenarSelectServicios("selectServicioFactura");
    llenarSelectOrdenesFactura();
    cargarFacturas();

    document.getElementById("btnAgregarProductoFactura").addEventListener("click", agregarProductoFactura);
    document.getElementById("btnAgregarServicioFactura").addEventListener("click", agregarServicioFactura);
    document.getElementById("descuentoFactura").addEventListener("input", calcularTotalesFactura);
    document.getElementById("formFactura").addEventListener("submit", guardarFactura);
    document.getElementById("btnBuscarFactura").addEventListener("click", () => {
        cargarFacturas(document.getElementById("buscarFactura").value);
    });
    document.getElementById("btnLimpiarFactura").addEventListener("click", limpiarFactura);
    document.getElementById("btnImprimirFactura").addEventListener("click", imprimirFacturaActual);
}

async function llenarSelectOrdenesFactura() {
    const select = document.getElementById("id_orden");
    if (!select) return;

    const respuesta = await apiFetch("/ordenes");
    select.innerHTML = `<option value="">Sin orden</option>`;

    respuesta.datos.forEach(o => {
        select.innerHTML += `<option value="${o.id_orden}">${o.numero_orden} - ${o.cliente}</option>`;
    });
}

function agregarProductoFactura() {
    const select = document.getElementById("selectProductoFactura");
    const option = select.options[select.selectedIndex];
    const cantidad = Number(document.getElementById("cantidadProductoFactura").value || 1);
    const descuento = Number(document.getElementById("descuentoProductoFactura").value || 0);

    if (!select.value) return alert("Seleccione un producto");

    const precio = Number(option.dataset.precio || 0);
    const iva = Number(option.dataset.iva || 0);
    const subtotal = cantidad * precio - descuento;

    detalleFactura.push({
        tipo_item: "Producto",
        id_producto: Number(select.value),
        id_servicio: null,
        descripcion: option.dataset.nombre,
        cantidad,
        precio_unitario: precio,
        descuento,
        iva,
        subtotal
    });

    renderDetalleFactura();
}

function agregarServicioFactura() {
    const select = document.getElementById("selectServicioFactura");
    const option = select.options[select.selectedIndex];
    const descuento = Number(document.getElementById("descuentoServicioFactura").value || 0);

    if (!select.value) return alert("Seleccione un servicio");

    const precio = Number(option.dataset.precio || 0);
    const subtotal = precio - descuento;

    detalleFactura.push({
        tipo_item: "Servicio",
        id_producto: null,
        id_servicio: Number(select.value),
        descripcion: option.dataset.nombre,
        cantidad: 1,
        precio_unitario: precio,
        descuento,
        iva: 15,
        subtotal
    });

    renderDetalleFactura();
}

function renderDetalleFactura() {
    const tabla = document.getElementById("tablaDetalleFactura");

    if (detalleFactura.length === 0) {
        tabla.innerHTML = `<tr><td colspan="8">Sin productos o servicios agregados</td></tr>`;
    } else {
        tabla.innerHTML = detalleFactura.map((d, i) => `
            <tr>
                <td>${d.tipo_item}</td>
                <td>${d.descripcion}</td>
                <td>${d.cantidad}</td>
                <td>${formatoDinero(d.precio_unitario)}</td>
                <td>${formatoDinero(d.descuento)}</td>
                <td>${d.iva}%</td>
                <td>${formatoDinero(d.subtotal)}</td>
                <td><button type="button" class="btn-tabla btn-eliminar" onclick="quitarDetalleFactura(${i})">X</button></td>
            </tr>
        `).join("");
    }

    calcularTotalesFactura();
}

function quitarDetalleFactura(i) {
    detalleFactura.splice(i, 1);
    renderDetalleFactura();
}

function calcularTotalesFactura() {
    const subtotal = detalleFactura.reduce((acc, d) => acc + Number(d.subtotal || 0), 0);
    const descuentoGeneral = Number(document.getElementById("descuentoFactura")?.value || 0);
    const iva = detalleFactura.reduce((acc, d) => acc + (Number(d.subtotal || 0) * Number(d.iva || 0) / 100), 0);
    const descuentosItems = detalleFactura.reduce((acc, d) => acc + Number(d.descuento || 0), 0);
    const total = subtotal - descuentoGeneral + iva;

    document.getElementById("subtotalFactura").textContent = formatoDinero(subtotal);
    document.getElementById("descuentoTotalFactura").textContent = formatoDinero(descuentoGeneral + descuentosItems);
    document.getElementById("ivaFactura").textContent = formatoDinero(iva);
    document.getElementById("totalFactura").textContent = formatoDinero(total);
}

async function guardarFactura(e) {
    e.preventDefault();

    const factura = {
        id_cliente: document.getElementById("id_cliente").value,
        id_orden: document.getElementById("id_orden").value || null,
        descuento: Number(document.getElementById("descuentoFactura").value || 0),
        metodo_pago: document.getElementById("metodo_pago").value,
        detalles: detalleFactura
    };

    try {
        await apiFetch("/facturas", {
            method: "POST",
            body: JSON.stringify(factura)
        });

        mostrarMensaje("mensajeFactura", "Factura guardada correctamente", "ok");
        limpiarFactura();
        cargarFacturas();
        llenarSelectProductos("selectProductoFactura");

    } catch (error) {
        mostrarMensaje("mensajeFactura", error.message, "error");
    }
}

async function cargarFacturas(buscar = "") {
    try {
        const respuesta = await apiFetch(`/facturas?buscar=${encodeURIComponent(buscar)}`);
        const tabla = document.getElementById("tablaFacturas");

        if (!tabla) return;

        if (respuesta.datos.length === 0) {
            tabla.innerHTML = `<tr><td colspan="8">No hay facturas registradas</td></tr>`;
            return;
        }

        tabla.innerHTML = respuesta.datos.map(f => {
            const dataFactura = encodeURIComponent(JSON.stringify(f));

            return `
                <tr>
                    <td>${f.numero_factura}</td>
                    <td>${f.cliente}</td>
                    <td>${f.usuario}</td>
                    <td>${formatoFecha(f.fecha_emision)}</td>
                    <td>${formatoDinero(f.total)}</td>
                    <td>${f.metodo_pago}</td>
                    <td><span class="estado ${estadoClase(f.estado)}">${f.estado}</span></td>
                    <td>
                        <button class="btn-tabla btn-imprimir" onclick="imprimirFacturaTablaDesdeData('${dataFactura}')">Imprimir</button>
                        ${f.estado !== "Anulada" ? `<button class="btn-tabla btn-anular" onclick="anularFactura(${f.id_factura})">Anular</button>` : ""}
                    </td>
                </tr>
            `;
        }).join("");

    } catch (error) {
        if (document.getElementById("mensajeFactura")) {
            mostrarMensaje("mensajeFactura", error.message, "error");
        }
    }
}

async function anularFactura(id) {
    const motivo = prompt("Ingrese el motivo de anulación:");
    if (!motivo) return;

    try {
        await apiFetch(`/facturas/anular/${id}`, {
            method: "PUT",
            body: JSON.stringify({ motivo_anulacion: motivo })
        });

        cargarFacturas();

    } catch (error) {
        alert(error.message);
    }
}

function limpiarFactura() {
    document.getElementById("formFactura").reset();
    detalleFactura = [];
    renderDetalleFactura();
}

async function iniciarPagos() {
    await llenarSelectFacturas("id_factura");
    cargarPagos();

    document.getElementById("formPago").addEventListener("submit", guardarPago);
    document.getElementById("btnLimpiarPago").addEventListener("click", () => document.getElementById("formPago").reset());
}

async function llenarSelectFacturas(idSelect) {
    const select = document.getElementById(idSelect);
    if (!select) return;

    const respuesta = await apiFetch("/facturas");

    select.innerHTML = `<option value="">Seleccione factura</option>`;
    respuesta.datos.forEach(f => {
        select.innerHTML += `<option value="${f.id_factura}">${f.numero_factura} - ${f.cliente} - ${formatoDinero(f.total)}</option>`;
    });
}

async function guardarPago(e) {
    e.preventDefault();

    const pago = {
        id_factura: document.getElementById("id_factura").value,
        metodo_pago: document.getElementById("metodo_pago").value,
        monto_pagado: Number(document.getElementById("monto_pagado").value || 0)
    };

    try {
        await apiFetch("/pagos", {
            method: "POST",
            body: JSON.stringify(pago)
        });

        mostrarMensaje("mensajePago", "Pago registrado correctamente", "ok");
        document.getElementById("formPago").reset();
        cargarPagos();

    } catch (error) {
        mostrarMensaje("mensajePago", error.message, "error");
    }
}

async function cargarPagos() {
    try {
        const respuesta = await apiFetch("/pagos");
        const tabla = document.getElementById("tablaPagos");

        if (respuesta.datos.length === 0) {
            tabla.innerHTML = `<tr><td colspan="8">No hay pagos registrados</td></tr>`;
            return;
        }

        tabla.innerHTML = respuesta.datos.map(p => `
            <tr>
                <td>${p.numero_factura}</td>
                <td>${p.cliente}</td>
                <td>${formatoDinero(p.total)}</td>
                <td>${p.metodo_pago}</td>
                <td>${formatoDinero(p.monto_pagado)}</td>
                <td>${formatoDinero(p.saldo_pendiente)}</td>
                <td>${formatoFecha(p.fecha_pago)}</td>
                <td><span class="estado ${estadoClase(p.estado)}">${p.estado}</span></td>
            </tr>
        `).join("");

    } catch (error) {
        mostrarMensaje("mensajePago", error.message, "error");
    }
}

async function iniciarGarantias() {
    await llenarSelectFacturas("id_factura");
    await llenarSelectClientes("id_cliente");
    cargarGarantias();

    document.getElementById("formGarantia").addEventListener("submit", guardarGarantia);
    document.getElementById("btnLimpiarGarantia").addEventListener("click", () => document.getElementById("formGarantia").reset());
}

async function guardarGarantia(e) {
    e.preventDefault();

    const garantia = {
        id_factura: document.getElementById("id_factura").value,
        id_cliente: document.getElementById("id_cliente").value,
        descripcion: document.getElementById("descripcion").value.trim(),
        fecha_inicio: document.getElementById("fecha_inicio").value,
        fecha_fin: document.getElementById("fecha_fin").value,
        condiciones: document.getElementById("condiciones").value.trim()
    };

    try {
        await apiFetch("/garantias", {
            method: "POST",
            body: JSON.stringify(garantia)
        });

        mostrarMensaje("mensajeGarantia", "Garantía registrada correctamente", "ok");
        document.getElementById("formGarantia").reset();
        cargarGarantias();

    } catch (error) {
        mostrarMensaje("mensajeGarantia", error.message, "error");
    }
}

async function cargarGarantias() {
    try {
        const respuesta = await apiFetch("/garantias");
        const tabla = document.getElementById("tablaGarantias");

        if (respuesta.datos.length === 0) {
            tabla.innerHTML = `<tr><td colspan="6">No hay garantías registradas</td></tr>`;
            return;
        }

        tabla.innerHTML = respuesta.datos.map(g => `
            <tr>
                <td>${g.numero_factura}</td>
                <td>${g.cliente}</td>
                <td>${g.descripcion}</td>
                <td>${g.fecha_inicio ? g.fecha_inicio.substring(0, 10) : ""}</td>
                <td>${g.fecha_fin ? g.fecha_fin.substring(0, 10) : ""}</td>
                <td><span class="estado ${estadoClase(g.estado)}">${g.estado}</span></td>
            </tr>
        `).join("");

    } catch (error) {
        mostrarMensaje("mensajeGarantia", error.message, "error");
    }
}

async function iniciarInventario() {
    await llenarSelectProductos("id_producto");
    cargarInventario();

    document.getElementById("formInventario").addEventListener("submit", guardarInventario);
    document.getElementById("btnLimpiarInventario").addEventListener("click", () => document.getElementById("formInventario").reset());
}

async function guardarInventario(e) {
    e.preventDefault();

    const movimiento = {
        id_producto: document.getElementById("id_producto").value,
        tipo_movimiento: document.getElementById("tipo_movimiento").value,
        cantidad: Number(document.getElementById("cantidad").value || 1),
        motivo: document.getElementById("motivo").value.trim()
    };

    try {
        await apiFetch("/inventario", {
            method: "POST",
            body: JSON.stringify(movimiento)
        });

        mostrarMensaje("mensajeInventario", "Movimiento registrado correctamente", "ok");
        document.getElementById("formInventario").reset();
        cargarInventario();
        llenarSelectProductos("id_producto");

    } catch (error) {
        mostrarMensaje("mensajeInventario", error.message, "error");
    }
}

async function cargarInventario() {
    try {
        const respuesta = await apiFetch("/inventario");
        const tabla = document.getElementById("tablaInventario");

        if (respuesta.datos.length === 0) {
            tabla.innerHTML = `<tr><td colspan="7">No hay movimientos registrados</td></tr>`;
            return;
        }

        tabla.innerHTML = respuesta.datos.map(m => `
            <tr>
                <td>${m.producto}</td>
                <td>${m.codigo}</td>
                <td>${m.tipo_movimiento}</td>
                <td>${m.cantidad}</td>
                <td>${m.motivo || ""}</td>
                <td>${m.usuario || ""}</td>
                <td>${formatoFecha(m.fecha)}</td>
            </tr>
        `).join("");

    } catch (error) {
        mostrarMensaje("mensajeInventario", error.message, "error");
    }
}

function iniciarReportes() {
    cargarReportes();

    document.getElementById("formReportes").addEventListener("submit", (e) => {
        e.preventDefault();
        cargarReportes();
    });
}

async function cargarReportes() {
    try {
        const inicio = document.getElementById("fechaInicioReporte")?.value || "";
        const fin = document.getElementById("fechaFinReporte")?.value || "";

        let ruta = "/reportes";
        if (inicio && fin) ruta += `?fechaInicio=${inicio}&fechaFin=${fin}`;

        const respuesta = await apiFetch(ruta);
        const d = respuesta.datos;

        const totalVendido = d.ventasPorFecha.reduce((acc, v) => acc + Number(v.total || 0), 0);
        const totalFacturas = d.ventasPorFecha.reduce((acc, v) => acc + Number(v.facturas || 0), 0);

        document.getElementById("reporteTotalVendido").textContent = formatoDinero(totalVendido);
        document.getElementById("reporteTotalFacturas").textContent = totalFacturas;
        document.getElementById("reporteProductosVendidos").textContent = d.productosVendidos.length;
        document.getElementById("reporteStockBajo").textContent = d.stockBajo.length;

        llenarTablaSimple("tablaVentasPorFecha", d.ventasPorFecha, ["fecha", "facturas", "total"], true);
        llenarTablaSimple("tablaProductosVendidos", d.productosVendidos, ["descripcion", "cantidad", "total"], true);
        llenarTablaSimple("tablaServiciosSolicitados", d.serviciosSolicitados, ["descripcion", "cantidad", "total"], true);
        llenarTablaSimple("tablaOrdenesEstado", d.ordenesEstado, ["estado", "total"], false);
        llenarTablaSimple("tablaPagosPendientes", d.pagosPendientes, ["numero_factura", "cliente", "total", "pagado", "pendiente"], true);
        llenarTablaSimple("tablaStockBajo", d.stockBajo, ["codigo", "nombre", "stock", "stock_minimo"], false);

    } catch (error) {
        mostrarMensaje("mensajeReporte", error.message, "error");
    }
}

function llenarTablaSimple(idTabla, datos, campos, usarDinero) {
    const tabla = document.getElementById(idTabla);
    if (!tabla) return;

    if (!datos || datos.length === 0) {
        tabla.innerHTML = `<tr><td colspan="${campos.length}">Sin datos disponibles</td></tr>`;
        return;
    }

    tabla.innerHTML = datos.map(item => `
        <tr>
            ${campos.map(campo => {
                let valor = item[campo];

                if (campo === "fecha" && valor) {
                    valor = String(valor).substring(0, 10);
                }

                if (usarDinero && ["total", "pagado", "pendiente"].includes(campo)) {
                    valor = formatoDinero(valor);
                }

                return `<td>${valor ?? ""}</td>`;
            }).join("")}
        </tr>
    `).join("");
}

async function iniciarConfiguracion() {
    await cargarConfiguracion();

    document.getElementById("formConfiguracion").addEventListener("submit", guardarConfiguracion);

    document.querySelectorAll("#formConfiguracion input, #formConfiguracion textarea, #formConfiguracion select").forEach(input => {
        input.addEventListener("input", actualizarPreviewConfiguracion);
    });
}

async function cargarConfiguracion() {
    try {
        const respuesta = await apiFetch("/configuracion");
        const empresa = respuesta.datos.empresa;
        const config = respuesta.datos.configuracion;

        if (empresa) {
            document.getElementById("nombre_empresa").value = empresa.nombre_empresa || "";
            document.getElementById("nombre_comercial").value = empresa.nombre_comercial || "";
            document.getElementById("logo").value = empresa.logo || "";
            document.getElementById("ruc").value = empresa.ruc || "";
            document.getElementById("direccion").value = empresa.direccion || "";
            document.getElementById("telefono").value = empresa.telefono || "";
            document.getElementById("correo").value = empresa.correo || "";
            document.getElementById("iva").value = empresa.iva || 15;
            document.getElementById("datos_factura").value = empresa.datos_factura || "";
        }

        if (config) {
            document.getElementById("color_principal").value = config.color_principal || "#0A74DA";
            document.getElementById("color_secundario").value = config.color_secundario || "#00B4D8";
            document.getElementById("color_fondo").value = config.color_fondo || "#F4F8FB";
            document.getElementById("color_texto").value = config.color_texto || "#1F2937";
            document.getElementById("modo").value = "Claro";
            document.getElementById("moneda").value = config.moneda || "USD";
        }

        actualizarPreviewConfiguracion();

    } catch (error) {
        mostrarMensaje("mensajeConfiguracion", error.message, "error");
    }
}

async function guardarConfiguracion(e) {
    e.preventDefault();

    const datos = {
        nombre_empresa: document.getElementById("nombre_empresa").value.trim(),
        nombre_comercial: document.getElementById("nombre_comercial").value.trim(),
        logo: document.getElementById("logo").value.trim(),
        ruc: document.getElementById("ruc").value.trim(),
        direccion: document.getElementById("direccion").value.trim(),
        telefono: document.getElementById("telefono").value.trim(),
        correo: document.getElementById("correo").value.trim(),
        iva: Number(document.getElementById("iva").value || 0),
        datos_factura: document.getElementById("datos_factura").value.trim(),
        color_principal: document.getElementById("color_principal").value,
        color_secundario: document.getElementById("color_secundario").value,
        color_fondo: document.getElementById("color_fondo").value,
        color_texto: document.getElementById("color_texto").value,
        modo: "Claro",
        moneda: document.getElementById("moneda").value.trim()
    };

    try {
        await apiFetch("/configuracion", {
            method: "PUT",
            body: JSON.stringify(datos)
        });

        mostrarMensaje("mensajeConfiguracion", "Configuración guardada correctamente", "ok");

    } catch (error) {
        mostrarMensaje("mensajeConfiguracion", error.message, "error");
    }
}

function actualizarPreviewConfiguracion() {
    const campos = {
        previewNombreEmpresa: "nombre_empresa",
        previewNombreComercial: "nombre_comercial",
        previewRuc: "ruc",
        previewDireccion: "direccion",
        previewTelefono: "telefono",
        previewCorreo: "correo",
        previewIva: "iva",
        previewDatosFactura: "datos_factura"
    };

    Object.entries(campos).forEach(([preview, input]) => {
        const p = document.getElementById(preview);
        const i = document.getElementById(input);

        if (p && i) {
            p.textContent = i.value || "-";
        }
    });
}

function obtenerLogoImpresion() {
    return "logo.png";
}

function abrirVentanaImpresion(titulo, contenido) {
    const ventana = window.open("", "_blank", "width=950,height=750");

    if (!ventana) {
        alert("Permite las ventanas emergentes para imprimir.");
        return;
    }

    ventana.document.write(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>${limpiarTextoImpresion(titulo)}</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                    font-family: Arial, Helvetica, sans-serif;
                }

                body {
                    background: #eef5ff;
                    color: #172033;
                    padding: 30px;
                }

                .documento {
                    max-width: 880px;
                    margin: auto;
                    background: white;
                    border-radius: 24px;
                    overflow: hidden;
                    box-shadow: 0 24px 70px rgba(0, 0, 0, 0.16);
                    border: 1px solid #dbe4ef;
                    position: relative;
                }

                .marca-agua {
                    position: fixed;
                    inset: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    font-size: 82px;
                    font-weight: 900;
                    color: rgba(10, 116, 218, 0.035);
                    transform: rotate(-25deg);
                    pointer-events: none;
                    z-index: 0;
                    text-align: center;
                }

                .doc-header {
                    background:
                        radial-gradient(circle at top left, rgba(0, 180, 216, 0.35), transparent 35%),
                        linear-gradient(135deg, #020617, #061a40, #0a74da);
                    color: white;
                    padding: 30px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 20px;
                }

                .doc-logo {
                    width: 220px;
                    max-height: 96px;
                    object-fit: contain;
                    border-radius: 14px;
                    background: rgba(255, 255, 255, 0.08);
                    padding: 7px;
                }

                .doc-title {
                    text-align: right;
                }

                .doc-title h1 {
                    font-size: 30px;
                    margin-bottom: 7px;
                    letter-spacing: -0.5px;
                }

                .doc-title p {
                    font-size: 14px;
                    opacity: 0.92;
                    line-height: 1.45;
                }

                .doc-body {
                    padding: 30px;
                    position: relative;
                    z-index: 1;
                }

                .empresa {
                    margin-bottom: 22px;
                    padding: 17px;
                    border-radius: 17px;
                    background: #f8fbff;
                    border: 1px solid #dcefff;
                    font-size: 14px;
                    line-height: 1.6;
                }

                .grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 14px;
                    margin-bottom: 20px;
                }

                .box {
                    padding: 16px;
                    border-radius: 17px;
                    background: #f8fbff;
                    border: 1px solid #dcefff;
                    overflow-wrap: anywhere;
                }

                .box span {
                    display: block;
                    color: #64748b;
                    font-size: 12px;
                    font-weight: bold;
                    text-transform: uppercase;
                    margin-bottom: 6px;
                }

                .box strong {
                    font-size: 15px;
                    color: #0b1220;
                    line-height: 1.45;
                }

                .section-title {
                    margin: 24px 0 13px;
                    font-size: 18px;
                    color: #061a40;
                    border-left: 5px solid #00b4d8;
                    padding-left: 10px;
                }

                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                    overflow: hidden;
                    border-radius: 14px;
                    border: 1px solid #dbe4ef;
                }

                thead {
                    background: linear-gradient(135deg, #061a40, #0a74da);
                    color: white;
                }

                th,
                td {
                    padding: 12px;
                    text-align: left;
                    border-bottom: 1px solid #e5e7eb;
                    font-size: 14px;
                }

                tbody tr:nth-child(even) {
                    background: #f8fbff;
                }

                .totales {
                    margin-top: 24px;
                    margin-left: auto;
                    max-width: 340px;
                    border-radius: 18px;
                    overflow: hidden;
                    border: 1px solid #dcefff;
                }

                .fila-total {
                    display: flex;
                    justify-content: space-between;
                    gap: 16px;
                    padding: 13px 16px;
                    background: #f8fbff;
                    border-bottom: 1px solid #dcefff;
                    font-weight: bold;
                }

                .fila-total.final {
                    background: linear-gradient(135deg, #020617, #061a40, #0a74da);
                    color: white;
                    font-size: 20px;
                }

                .nota {
                    margin-top: 26px;
                    padding: 16px;
                    border-radius: 17px;
                    background: #fff7ed;
                    border: 1px solid #fed7aa;
                    color: #92400e;
                    font-size: 13px;
                    line-height: 1.5;
                }

                .firmas {
                    margin-top: 60px;
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 38px;
                }

                .firma {
                    text-align: center;
                    padding-top: 36px;
                    border-top: 1px solid #334155;
                    font-weight: bold;
                    color: #334155;
                }

                .footer {
                    padding: 18px 30px;
                    background: #f8fbff;
                    color: #64748b;
                    font-size: 12px;
                    display: flex;
                    justify-content: space-between;
                    gap: 10px;
                    border-top: 1px solid #dcefff;
                }

                @media print {
                    body {
                        background: white;
                        padding: 0;
                    }

                    .documento {
                        box-shadow: none;
                        border-radius: 0;
                        border: none;
                        max-width: 100%;
                    }

                    .doc-header,
                    thead,
                    .fila-total.final,
                    .footer {
                        print-color-adjust: exact;
                        -webkit-print-color-adjust: exact;
                    }
                }
            </style>
        </head>

        <body>
            <div class="marca-agua">TECNOLOGÍA DIGITAL</div>
            ${contenido}
            <script>
                window.onload = () => {
                    setTimeout(() => window.print(), 450);
                };
            <\/script>
        </body>
        </html>
    `);

    ventana.document.close();
}

function imprimirComprobanteOrden() {
    const cliente = document.getElementById("id_cliente");
    const tecnico = document.getElementById("id_tecnico");

    const clienteTexto = limpiarTextoImpresion(cliente.options[cliente.selectedIndex]?.text || "Cliente no seleccionado");
    const tecnicoTexto = limpiarTextoImpresion(tecnico.options[tecnico.selectedIndex]?.text || "Sin técnico asignado");

    const equipo = limpiarTextoImpresion(document.getElementById("equipo").value || "No especificado");
    const marca = limpiarTextoImpresion(document.getElementById("marca").value || "No especificado");
    const modelo = limpiarTextoImpresion(document.getElementById("modelo").value || "No especificado");
    const serie = limpiarTextoImpresion(document.getElementById("numero_serie").value || "No especificado");
    const accesorios = limpiarTextoImpresion(document.getElementById("accesorios_recibidos").value || "Sin accesorios registrados");
    const problema = limpiarTextoImpresion(document.getElementById("problema_reportado").value || "Sin problema reportado");
    const diagnostico = limpiarTextoImpresion(document.getElementById("diagnostico").value || "Pendiente");
    const solucion = limpiarTextoImpresion(document.getElementById("solucion").value || "Pendiente");
    const observaciones = limpiarTextoImpresion(document.getElementById("observaciones").value || "Sin observaciones");
    const estado = limpiarTextoImpresion(document.getElementById("estado").value || "Recibido");
    const fechaEntrega = limpiarTextoImpresion(document.getElementById("fecha_entrega").value || "Pendiente");
    const total = limpiarTextoImpresion(document.getElementById("totalOrden").textContent || "$0.00");

    const filasProductos = productosOrden.length
        ? productosOrden.map(p => `
            <tr>
                <td>${limpiarTextoImpresion(p.nombre)}</td>
                <td>${p.cantidad}</td>
                <td>${formatoDinero(p.precio_unitario)}</td>
                <td>${formatoDinero(p.subtotal)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="4">Sin productos agregados</td></tr>`;

    const filasServicios = serviciosOrden.length
        ? serviciosOrden.map(s => `
            <tr>
                <td>${limpiarTextoImpresion(s.nombre)}</td>
                <td>${formatoDinero(s.precio)}</td>
                <td>${formatoDinero(s.subtotal)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="3">Sin servicios agregados</td></tr>`;

    const contenido = `
        <div class="documento">
            <div class="doc-header">
                <img src="${obtenerLogoImpresion()}" class="doc-logo">
                <div class="doc-title">
                    <h1>Comprobante de Recepción</h1>
                    <p>Orden de Servicio Técnico</p>
                    <p>${new Date().toLocaleString("es-EC")}</p>
                </div>
            </div>

            <div class="doc-body">
                <div class="empresa">
                    <strong>Tecnología Digital - Servicio Técnico</strong><br>
                    RUC: 1803980778001<br>
                    Dirección: Ambato, Clemente Yerovi y Velasco Ibarra Esq.<br>
                    Teléfono: 0987021100
                </div>

                <div class="grid">
                    <div class="box"><span>Cliente</span><strong>${clienteTexto}</strong></div>
                    <div class="box"><span>Técnico asignado</span><strong>${tecnicoTexto}</strong></div>
                    <div class="box"><span>Equipo</span><strong>${equipo}</strong></div>
                    <div class="box"><span>Marca / Modelo</span><strong>${marca} / ${modelo}</strong></div>
                    <div class="box"><span>Número de serie</span><strong>${serie}</strong></div>
                    <div class="box"><span>Estado</span><strong>${estado}</strong></div>
                    <div class="box"><span>Fecha estimada</span><strong>${fechaEntrega}</strong></div>
                    <div class="box"><span>Total estimado</span><strong>${total}</strong></div>
                </div>

                <h2 class="section-title">Detalle del equipo</h2>
                <div class="box"><span>Accesorios recibidos</span><strong>${accesorios}</strong></div><br>
                <div class="box"><span>Problema reportado</span><strong>${problema}</strong></div><br>
                <div class="box"><span>Diagnóstico</span><strong>${diagnostico}</strong></div><br>
                <div class="box"><span>Solución / Trabajo realizado</span><strong>${solucion}</strong></div><br>
                <div class="box"><span>Observaciones</span><strong>${observaciones}</strong></div>

                <h2 class="section-title">Productos usados</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Producto</th>
                            <th>Cantidad</th>
                            <th>Precio</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>${filasProductos}</tbody>
                </table>

                <h2 class="section-title">Servicios realizados</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Servicio</th>
                            <th>Precio</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>${filasServicios}</tbody>
                </table>

                <div class="totales">
                    <div class="fila-total final">
                        <span>Total estimado</span>
                        <span>${total}</span>
                    </div>
                </div>

                <div class="nota">
                    Este comprobante confirma la recepción del equipo. La garantía no cubre golpes, humedad, manipulación externa o daños no reportados al momento de ingreso.
                </div>

                <div class="firmas">
                    <div class="firma">Firma del cliente</div>
                    <div class="firma">Firma del técnico</div>
                </div>
            </div>

            <div class="footer">
                <span>Tecnología Digital</span>
                <span>Comprobante generado automáticamente</span>
            </div>
        </div>
    `;

    abrirVentanaImpresion("Comprobante de Orden", contenido);
}

function imprimirOrdenTablaDesdeData(data) {
    const o = JSON.parse(decodeURIComponent(data));
    imprimirOrdenTabla(o);
}

function imprimirOrdenTabla(o) {
    const contenido = `
        <div class="documento">
            <div class="doc-header">
                <img src="${obtenerLogoImpresion()}" class="doc-logo">
                <div class="doc-title">
                    <h1>Comprobante de Orden</h1>
                    <p>${limpiarTextoImpresion(o.numero_orden)}</p>
                    <p>${new Date().toLocaleString("es-EC")}</p>
                </div>
            </div>

            <div class="doc-body">
                <div class="empresa">
                    <strong>Tecnología Digital - Servicio Técnico</strong><br>
                    RUC: 1803980778001<br>
                    Dirección: Ambato, Clemente Yerovi y Velasco Ibarra Esq.<br>
                    Teléfono: 0987021100
                </div>

                <div class="grid">
                    <div class="box"><span>Cliente</span><strong>${limpiarTextoImpresion(o.cliente)}</strong></div>
                    <div class="box"><span>Técnico</span><strong>${limpiarTextoImpresion(o.tecnico || "Sin asignar")}</strong></div>
                    <div class="box"><span>Equipo</span><strong>${limpiarTextoImpresion(o.equipo)}</strong></div>
                    <div class="box"><span>Marca / Modelo</span><strong>${limpiarTextoImpresion(o.marca || "")} / ${limpiarTextoImpresion(o.modelo || "")}</strong></div>
                    <div class="box"><span>Serie</span><strong>${limpiarTextoImpresion(o.numero_serie || "No registrada")}</strong></div>
                    <div class="box"><span>Estado</span><strong>${limpiarTextoImpresion(o.estado)}</strong></div>
                    <div class="box"><span>Fecha ingreso</span><strong>${formatoFecha(o.fecha_ingreso)}</strong></div>
                    <div class="box"><span>Total estimado</span><strong>${formatoDinero(o.total_estimado)}</strong></div>
                </div>

                <h2 class="section-title">Problema reportado</h2>
                <div class="box"><strong>${limpiarTextoImpresion(o.problema_reportado || "Sin información")}</strong></div>

                <h2 class="section-title">Diagnóstico</h2>
                <div class="box"><strong>${limpiarTextoImpresion(o.diagnostico || "Pendiente")}</strong></div>

                <h2 class="section-title">Solución</h2>
                <div class="box"><strong>${limpiarTextoImpresion(o.solucion || "Pendiente")}</strong></div>

                <div class="totales">
                    <div class="fila-total final">
                        <span>Total estimado</span>
                        <span>${formatoDinero(o.total_estimado)}</span>
                    </div>
                </div>

                <div class="firmas">
                    <div class="firma">Firma del cliente</div>
                    <div class="firma">Firma del técnico</div>
                </div>
            </div>

            <div class="footer">
                <span>Tecnología Digital</span>
                <span>Orden generada automáticamente</span>
            </div>
        </div>
    `;

    abrirVentanaImpresion("Comprobante de Orden", contenido);
}

function imprimirFacturaActual() {
    const cliente = document.getElementById("id_cliente");
    const clienteTexto = limpiarTextoImpresion(cliente.options[cliente.selectedIndex]?.text || "Cliente no seleccionado");
    const metodoPago = limpiarTextoImpresion(document.getElementById("metodo_pago").value || "Pendiente");

    const subtotal = limpiarTextoImpresion(document.getElementById("subtotalFactura").textContent || "$0.00");
    const descuento = limpiarTextoImpresion(document.getElementById("descuentoTotalFactura").textContent || "$0.00");
    const iva = limpiarTextoImpresion(document.getElementById("ivaFactura").textContent || "$0.00");
    const total = limpiarTextoImpresion(document.getElementById("totalFactura").textContent || "$0.00");

    const filas = detalleFactura.length
        ? detalleFactura.map(d => `
            <tr>
                <td>${limpiarTextoImpresion(d.tipo_item)}</td>
                <td>${limpiarTextoImpresion(d.descripcion)}</td>
                <td>${d.cantidad}</td>
                <td>${formatoDinero(d.precio_unitario)}</td>
                <td>${formatoDinero(d.descuento)}</td>
                <td>${d.iva}%</td>
                <td>${formatoDinero(d.subtotal)}</td>
            </tr>
        `).join("")
        : `<tr><td colspan="7">Sin productos o servicios agregados</td></tr>`;

    const contenido = `
        <div class="documento">
            <div class="doc-header">
                <img src="${obtenerLogoImpresion()}" class="doc-logo">
                <div class="doc-title">
                    <h1>Factura Proforma</h1>
                    <p>Tecnología Digital</p>
                    <p>${new Date().toLocaleString("es-EC")}</p>
                </div>
            </div>

            <div class="doc-body">
                <div class="empresa">
                    <strong>Tecnología Digital - Servicio Técnico</strong><br>
                    RUC: 1803980778001<br>
                    Dirección: Ambato, Clemente Yerovi y Velasco Ibarra Esq.<br>
                    Teléfono: 0987021100
                </div>

                <div class="grid">
                    <div class="box"><span>Cliente</span><strong>${clienteTexto}</strong></div>
                    <div class="box"><span>Método de pago</span><strong>${metodoPago}</strong></div>
                    <div class="box"><span>Fecha de emisión</span><strong>${new Date().toLocaleString("es-EC")}</strong></div>
                    <div class="box"><span>Estado</span><strong>${metodoPago === "Pendiente" ? "Pendiente" : "Pagada"}</strong></div>
                </div>

                <h2 class="section-title">Detalle de factura</h2>

                <table>
                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Descripción</th>
                            <th>Cant.</th>
                            <th>Precio</th>
                            <th>Desc.</th>
                            <th>IVA</th>
                            <th>Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>${filas}</tbody>
                </table>

                <div class="totales">
                    <div class="fila-total"><span>Subtotal</span><span>${subtotal}</span></div>
                    <div class="fila-total"><span>Descuento</span><span>${descuento}</span></div>
                    <div class="fila-total"><span>IVA</span><span>${iva}</span></div>
                    <div class="fila-total final"><span>Total</span><span>${total}</span></div>
                </div>

                <div class="nota">
                    Gracias por confiar en Tecnología Digital. Esta factura/proforma fue generada desde el sistema de facturación.
                </div>

                <div class="firmas">
                    <div class="firma">Firma del cliente</div>
                    <div class="firma">Firma autorizada</div>
                </div>
            </div>

            <div class="footer">
                <span>Tecnología Digital</span>
                <span>Factura generada automáticamente</span>
            </div>
        </div>
    `;

    abrirVentanaImpresion("Factura Tecnología Digital", contenido);
}

function imprimirFacturaTablaDesdeData(data) {
    const f = JSON.parse(decodeURIComponent(data));
    imprimirFacturaTabla(f);
}

function imprimirFacturaTabla(f) {
    const contenido = `
        <div class="documento">
            <div class="doc-header">
                <img src="${obtenerLogoImpresion()}" class="doc-logo">
                <div class="doc-title">
                    <h1>Factura</h1>
                    <p>${limpiarTextoImpresion(f.numero_factura)}</p>
                    <p>${formatoFecha(f.fecha_emision)}</p>
                </div>
            </div>

            <div class="doc-body">
                <div class="empresa">
                    <strong>Tecnología Digital - Servicio Técnico</strong><br>
                    RUC: 1803980778001<br>
                    Dirección: Ambato, Clemente Yerovi y Velasco Ibarra Esq.<br>
                    Teléfono: 0987021100
                </div>

                <div class="grid">
                    <div class="box"><span>Cliente</span><strong>${limpiarTextoImpresion(f.cliente)}</strong></div>
                    <div class="box"><span>Atendido por</span><strong>${limpiarTextoImpresion(f.usuario)}</strong></div>
                    <div class="box"><span>Método de pago</span><strong>${limpiarTextoImpresion(f.metodo_pago)}</strong></div>
                    <div class="box"><span>Estado</span><strong>${limpiarTextoImpresion(f.estado)}</strong></div>
                    <div class="box"><span>Subtotal</span><strong>${formatoDinero(f.subtotal)}</strong></div>
                    <div class="box"><span>IVA</span><strong>${formatoDinero(f.iva)}</strong></div>
                </div>

                <div class="totales">
                    <div class="fila-total"><span>Subtotal</span><span>${formatoDinero(f.subtotal)}</span></div>
                    <div class="fila-total"><span>Descuento</span><span>${formatoDinero(f.descuento)}</span></div>
                    <div class="fila-total"><span>IVA</span><span>${formatoDinero(f.iva)}</span></div>
                    <div class="fila-total final"><span>Total</span><span>${formatoDinero(f.total)}</span></div>
                </div>

                <div class="nota">
                    Documento generado desde el sistema de facturación de Tecnología Digital.
                </div>

                <div class="firmas">
                    <div class="firma">Firma del cliente</div>
                    <div class="firma">Firma autorizada</div>
                </div>
            </div>

            <div class="footer">
                <span>Tecnología Digital</span>
                <span>Factura generada automáticamente</span>
            </div>
        </div>
    `;

    abrirVentanaImpresion("Factura Tecnología Digital", contenido);
}