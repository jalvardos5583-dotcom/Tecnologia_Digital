const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const conexion = require("./conexion");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || "clave_segura_tecnologia_digital";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "8h";

function verificarToken(req, res, next) {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({
            ok: false,
            mensaje: "Token no enviado"
        });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            ok: false,
            mensaje: "Token inválido"
        });
    }

    try {
        const usuario = jwt.verify(token, JWT_SECRET);
        req.usuario = usuario;
        next();
    } catch (error) {
        return res.status(401).json({
            ok: false,
            mensaje: "Token vencido o incorrecto"
        });
    }
}

app.get("/", (req, res) => {
    res.json({
        ok: true,
        mensaje: "Servidor de Tecnología Digital funcionando correctamente"
    });
});

app.post("/api/login", async (req, res) => {
    try {
        const { correo, contraseña } = req.body;

        if (!correo || !contraseña) {
            return res.status(400).json({
                ok: false,
                mensaje: "Ingrese correo y contraseña"
            });
        }

        const [usuarios] = await conexion.query(
            `SELECT 
                u.id_usuario,
                u.cedula,
                u.nombre,
                u.apellido,
                u.telefono,
                u.correo,
                u.contraseña,
                u.estado,
                r.nombre AS rol
            FROM usuarios u
            INNER JOIN roles r ON u.id_rol = r.id_rol
            WHERE u.correo = ?`,
            [correo]
        );

        if (usuarios.length === 0) {
            return res.status(404).json({
                ok: false,
                mensaje: "Correo no registrado"
            });
        }

        const usuario = usuarios[0];

        if (usuario.estado !== "Activo") {
            return res.status(403).json({
                ok: false,
                mensaje: "Usuario inactivo"
            });
        }

        const passwordCorrecta = await bcrypt.compare(contraseña, usuario.contraseña);

        if (!passwordCorrecta) {
            return res.status(401).json({
                ok: false,
                mensaje: "Contraseña incorrecta"
            });
        }

        const token = jwt.sign(
            {
                id_usuario: usuario.id_usuario,
                correo: usuario.correo,
                rol: usuario.rol
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        res.json({
            ok: true,
            mensaje: "Login correcto",
            token,
            usuario: {
                id_usuario: usuario.id_usuario,
                cedula: usuario.cedula,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                telefono: usuario.telefono,
                correo: usuario.correo,
                rol: usuario.rol
            }
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error en el login",
            error: error.message
        });
    }
});

app.post("/api/crear-cuenta", async (req, res) => {
    try {
        const {
            cedula,
            nombre,
            apellido,
            telefono,
            correo,
            contraseña
        } = req.body;

        if (!cedula || !nombre || !apellido || !telefono || !correo || !contraseña) {
            return res.status(400).json({
                ok: false,
                mensaje: "Todos los campos son obligatorios"
            });
        }

        const validarCorreo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!validarCorreo.test(correo)) {
            return res.status(400).json({
                ok: false,
                mensaje: "Correo electrónico inválido"
            });
        }

        if (contraseña.length < 8) {
            return res.status(400).json({
                ok: false,
                mensaje: "La contraseña debe tener mínimo 8 caracteres"
            });
        }

        const [repetidos] = await conexion.query(
            "SELECT id_usuario FROM usuarios WHERE correo = ? OR cedula = ?",
            [correo, cedula]
        );

        if (repetidos.length > 0) {
            return res.status(400).json({
                ok: false,
                mensaje: "El correo o la cédula ya están registrados"
            });
        }

        const contraseñaCifrada = await bcrypt.hash(contraseña, 10);

        const [rol] = await conexion.query(
            "SELECT id_rol FROM roles WHERE nombre = 'Vendedor' LIMIT 1"
        );

        const idRol = rol.length > 0 ? rol[0].id_rol : 3;

        await conexion.query(
            `INSERT INTO usuarios 
            (cedula, nombre, apellido, telefono, correo, contraseña, id_rol, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Activo')`,
            [cedula, nombre, apellido, telefono, correo, contraseñaCifrada, idRol]
        );

        res.json({
            ok: true,
            mensaje: "Cuenta creada correctamente"
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al crear cuenta",
            error: error.message
        });
    }
});

app.get("/api/dashboard", verificarToken, async (req, res) => {
    try {
        const [[ventasDia]] = await conexion.query(
            `SELECT IFNULL(SUM(total), 0) AS total 
             FROM facturas 
             WHERE DATE(fecha_emision) = CURDATE() 
             AND estado != 'Anulada'`
        );

        const [[serviciosPendientes]] = await conexion.query(
            `SELECT COUNT(*) AS total 
             FROM ordenes_servicio 
             WHERE estado NOT IN ('Entregado', 'Cancelado')`
        );

        const [[clientes]] = await conexion.query(
            "SELECT COUNT(*) AS total FROM clientes WHERE estado = 'Activo'"
        );

        const [[productosStock]] = await conexion.query(
            "SELECT IFNULL(SUM(stock), 0) AS total FROM productos WHERE estado = 'Activo'"
        );

        const [[facturasEmitidas]] = await conexion.query(
            "SELECT COUNT(*) AS total FROM facturas"
        );

        const [[bajoStock]] = await conexion.query(
            "SELECT COUNT(*) AS total FROM productos WHERE stock <= stock_minimo AND estado = 'Activo'"
        );

        const [[ordenesReparacion]] = await conexion.query(
            "SELECT COUNT(*) AS total FROM ordenes_servicio WHERE estado = 'En reparación'"
        );

        const [[ganancias]] = await conexion.query(
            `SELECT IFNULL(SUM(df.subtotal), 0) AS total
             FROM detalle_factura df
             INNER JOIN facturas f ON df.id_factura = f.id_factura
             WHERE f.estado != 'Anulada'`
        );

        res.json({
            ok: true,
            datos: {
                ventas_dia: ventasDia.total,
                servicios_pendientes: serviciosPendientes.total,
                clientes_registrados: clientes.total,
                productos_stock: productosStock.total,
                facturas_emitidas: facturasEmitidas.total,
                productos_bajo_stock: bajoStock.total,
                ordenes_reparacion: ordenesReparacion.total,
                ganancias_aproximadas: ganancias.total
            }
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al cargar dashboard",
            error: error.message
        });
    }
});

app.get("/api/clientes", verificarToken, async (req, res) => {
    try {
        const buscar = req.query.buscar || "";

        const [clientes] = await conexion.query(
            `SELECT * FROM clientes
             WHERE nombres LIKE ? 
             OR identificacion LIKE ?
             OR correo LIKE ?
             ORDER BY id_cliente DESC`,
            [`%${buscar}%`, `%${buscar}%`, `%${buscar}%`]
        );

        res.json({ ok: true, datos: clientes });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al listar clientes",
            error: error.message
        });
    }
});

app.post("/api/clientes", verificarToken, async (req, res) => {
    try {
        const {
            tipo_identificacion,
            identificacion,
            nombres,
            telefono,
            correo,
            direccion
        } = req.body;

        if (!identificacion || !nombres) {
            return res.status(400).json({
                ok: false,
                mensaje: "Identificación y nombres son obligatorios"
            });
        }

        await conexion.query(
            `INSERT INTO clientes
            (tipo_identificacion, identificacion, nombres, telefono, correo, direccion)
            VALUES (?, ?, ?, ?, ?, ?)`,
            [tipo_identificacion, identificacion, nombres, telefono, correo, direccion]
        );

        res.json({
            ok: true,
            mensaje: "Cliente registrado correctamente"
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al registrar cliente",
            error: error.message
        });
    }
});

app.put("/api/clientes/:id", verificarToken, async (req, res) => {
    try {
        const { id } = req.params;

        const {
            tipo_identificacion,
            identificacion,
            nombres,
            telefono,
            correo,
            direccion,
            estado
        } = req.body;

        await conexion.query(
            `UPDATE clientes SET
            tipo_identificacion = ?,
            identificacion = ?,
            nombres = ?,
            telefono = ?,
            correo = ?,
            direccion = ?,
            estado = ?
            WHERE id_cliente = ?`,
            [tipo_identificacion, identificacion, nombres, telefono, correo, direccion, estado, id]
        );

        res.json({
            ok: true,
            mensaje: "Cliente actualizado correctamente"
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al actualizar cliente",
            error: error.message
        });
    }
});

app.delete("/api/clientes/:id", verificarToken, async (req, res) => {
    try {
        const { id } = req.params;

        await conexion.query(
            "UPDATE clientes SET estado = 'Inactivo' WHERE id_cliente = ?",
            [id]
        );

        res.json({
            ok: true,
            mensaje: "Cliente desactivado correctamente"
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al desactivar cliente",
            error: error.message
        });
    }
});

app.get("/api/productos", verificarToken, async (req, res) => {
    try {
        const buscar = req.query.buscar || "";

        const [productos] = await conexion.query(
            `SELECT * FROM productos
             WHERE codigo LIKE ?
             OR nombre LIKE ?
             OR marca LIKE ?
             OR categoria LIKE ?
             ORDER BY id_producto DESC`,
            [`%${buscar}%`, `%${buscar}%`, `%${buscar}%`, `%${buscar}%`]
        );

        res.json({ ok: true, datos: productos });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al listar productos",
            error: error.message
        });
    }
});

app.post("/api/productos", verificarToken, async (req, res) => {
    try {
        const {
            codigo,
            nombre,
            marca,
            modelo,
            categoria,
            descripcion,
            precio_compra,
            precio_venta,
            stock,
            stock_minimo,
            iva
        } = req.body;

        if (!codigo || !nombre) {
            return res.status(400).json({
                ok: false,
                mensaje: "Código y nombre son obligatorios"
            });
        }

        await conexion.query(
            `INSERT INTO productos
            (codigo, nombre, marca, modelo, categoria, descripcion, precio_compra, precio_venta, stock, stock_minimo, iva)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [codigo, nombre, marca, modelo, categoria, descripcion, precio_compra, precio_venta, stock, stock_minimo, iva]
        );

        res.json({
            ok: true,
            mensaje: "Producto registrado correctamente"
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al registrar producto",
            error: error.message
        });
    }
});

app.put("/api/productos/:id", verificarToken, async (req, res) => {
    try {
        const { id } = req.params;

        const {
            codigo,
            nombre,
            marca,
            modelo,
            categoria,
            descripcion,
            precio_compra,
            precio_venta,
            stock,
            stock_minimo,
            iva,
            estado
        } = req.body;

        await conexion.query(
            `UPDATE productos SET
            codigo = ?,
            nombre = ?,
            marca = ?,
            modelo = ?,
            categoria = ?,
            descripcion = ?,
            precio_compra = ?,
            precio_venta = ?,
            stock = ?,
            stock_minimo = ?,
            iva = ?,
            estado = ?
            WHERE id_producto = ?`,
            [codigo, nombre, marca, modelo, categoria, descripcion, precio_compra, precio_venta, stock, stock_minimo, iva, estado, id]
        );

        res.json({
            ok: true,
            mensaje: "Producto actualizado correctamente"
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al actualizar producto",
            error: error.message
        });
    }
});

app.delete("/api/productos/:id", verificarToken, async (req, res) => {
    try {
        const { id } = req.params;

        await conexion.query(
            "UPDATE productos SET estado = 'Inactivo' WHERE id_producto = ?",
            [id]
        );

        res.json({
            ok: true,
            mensaje: "Producto desactivado correctamente"
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al desactivar producto",
            error: error.message
        });
    }
});

app.get("/api/servicios", verificarToken, async (req, res) => {
    try {
        const buscar = req.query.buscar || "";

        const [servicios] = await conexion.query(
            `SELECT * FROM servicios
             WHERE nombre LIKE ?
             OR descripcion LIKE ?
             ORDER BY id_servicio DESC`,
            [`%${buscar}%`, `%${buscar}%`]
        );

        res.json({ ok: true, datos: servicios });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al listar servicios",
            error: error.message
        });
    }
});

app.post("/api/servicios", verificarToken, async (req, res) => {
    try {
        const {
            nombre,
            descripcion,
            precio,
            tiempo_estimado,
            garantia_dias
        } = req.body;

        if (!nombre) {
            return res.status(400).json({
                ok: false,
                mensaje: "El nombre del servicio es obligatorio"
            });
        }

        await conexion.query(
            `INSERT INTO servicios
            (nombre, descripcion, precio, tiempo_estimado, garantia_dias)
            VALUES (?, ?, ?, ?, ?)`,
            [nombre, descripcion, precio, tiempo_estimado, garantia_dias]
        );

        res.json({
            ok: true,
            mensaje: "Servicio registrado correctamente"
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al registrar servicio",
            error: error.message
        });
    }
});

app.put("/api/servicios/:id", verificarToken, async (req, res) => {
    try {
        const { id } = req.params;

        const {
            nombre,
            descripcion,
            precio,
            tiempo_estimado,
            garantia_dias,
            estado
        } = req.body;

        await conexion.query(
            `UPDATE servicios SET
            nombre = ?,
            descripcion = ?,
            precio = ?,
            tiempo_estimado = ?,
            garantia_dias = ?,
            estado = ?
            WHERE id_servicio = ?`,
            [nombre, descripcion, precio, tiempo_estimado, garantia_dias, estado, id]
        );

        res.json({
            ok: true,
            mensaje: "Servicio actualizado correctamente"
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al actualizar servicio",
            error: error.message
        });
    }
});

app.delete("/api/servicios/:id", verificarToken, async (req, res) => {
    try {
        const { id } = req.params;

        await conexion.query(
            "UPDATE servicios SET estado = 'Inactivo' WHERE id_servicio = ?",
            [id]
        );

        res.json({
            ok: true,
            mensaje: "Servicio desactivado correctamente"
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al desactivar servicio",
            error: error.message
        });
    }
});

app.get("/api/ordenes", verificarToken, async (req, res) => {
    try {
        const buscar = req.query.buscar || "";

        const [ordenes] = await conexion.query(
            `SELECT 
                o.*,
                c.nombres AS cliente,
                CONCAT(u.nombre, ' ', u.apellido) AS tecnico
            FROM ordenes_servicio o
            INNER JOIN clientes c ON o.id_cliente = c.id_cliente
            LEFT JOIN usuarios u ON o.id_tecnico = u.id_usuario
            WHERE o.numero_orden LIKE ?
            OR c.nombres LIKE ?
            OR o.equipo LIKE ?
            OR o.estado LIKE ?
            ORDER BY o.id_orden DESC`,
            [`%${buscar}%`, `%${buscar}%`, `%${buscar}%`, `%${buscar}%`]
        );

        res.json({ ok: true, datos: ordenes });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al listar órdenes",
            error: error.message
        });
    }
});

app.post("/api/ordenes", verificarToken, async (req, res) => {
    const db = await conexion.getConnection();

    try {
        await db.beginTransaction();

        const {
            id_cliente,
            id_tecnico,
            equipo,
            marca,
            modelo,
            numero_serie,
            accesorios_recibidos,
            problema_reportado,
            diagnostico,
            solucion,
            observaciones,
            fecha_entrega,
            estado,
            productos,
            servicios
        } = req.body;

        if (!id_cliente || !equipo || !problema_reportado) {
            await db.rollback();
            return res.status(400).json({
                ok: false,
                mensaje: "Cliente, equipo y problema reportado son obligatorios"
            });
        }

        const [[ultimo]] = await db.query(
            "SELECT COUNT(*) + 1 AS numero FROM ordenes_servicio"
        );

        const numeroOrden = "ORD-" + String(ultimo.numero).padStart(6, "0");

        let totalEstimado = 0;

        if (Array.isArray(productos)) {
            productos.forEach(item => {
                totalEstimado += Number(item.cantidad) * Number(item.precio_unitario);
            });
        }

        if (Array.isArray(servicios)) {
            servicios.forEach(item => {
                totalEstimado += Number(item.precio);
            });
        }

        const [resultado] = await db.query(
            `INSERT INTO ordenes_servicio
            (numero_orden, id_cliente, id_tecnico, equipo, marca, modelo, numero_serie,
            accesorios_recibidos, problema_reportado, diagnostico, solucion, observaciones,
            fecha_entrega, estado, total_estimado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                numeroOrden,
                id_cliente,
                id_tecnico || null,
                equipo,
                marca,
                modelo,
                numero_serie,
                accesorios_recibidos,
                problema_reportado,
                diagnostico,
                solucion,
                observaciones,
                fecha_entrega || null,
                estado || "Recibido",
                totalEstimado
            ]
        );

        const idOrden = resultado.insertId;

        if (Array.isArray(productos)) {
            for (const item of productos) {
                const subtotal = Number(item.cantidad) * Number(item.precio_unitario);

                await db.query(
                    `INSERT INTO orden_detalle_productos
                    (id_orden, id_producto, cantidad, precio_unitario, subtotal)
                    VALUES (?, ?, ?, ?, ?)`,
                    [idOrden, item.id_producto, item.cantidad, item.precio_unitario, subtotal]
                );
            }
        }

        if (Array.isArray(servicios)) {
            for (const item of servicios) {
                await db.query(
                    `INSERT INTO orden_detalle_servicios
                    (id_orden, id_servicio, precio, subtotal)
                    VALUES (?, ?, ?, ?)`,
                    [idOrden, item.id_servicio, item.precio, item.precio]
                );
            }
        }

        await db.commit();

        res.json({
            ok: true,
            mensaje: "Orden creada correctamente",
            numero_orden: numeroOrden,
            id_orden: idOrden
        });

    } catch (error) {
        await db.rollback();

        res.status(500).json({
            ok: false,
            mensaje: "Error al crear orden",
            error: error.message
        });

    } finally {
        db.release();
    }
});

app.put("/api/ordenes/:id", verificarToken, async (req, res) => {
    try {
        const { id } = req.params;

        const {
            id_cliente,
            id_tecnico,
            equipo,
            marca,
            modelo,
            numero_serie,
            accesorios_recibidos,
            problema_reportado,
            diagnostico,
            solucion,
            observaciones,
            fecha_entrega,
            estado,
            total_estimado
        } = req.body;

        await conexion.query(
            `UPDATE ordenes_servicio SET
            id_cliente = ?,
            id_tecnico = ?,
            equipo = ?,
            marca = ?,
            modelo = ?,
            numero_serie = ?,
            accesorios_recibidos = ?,
            problema_reportado = ?,
            diagnostico = ?,
            solucion = ?,
            observaciones = ?,
            fecha_entrega = ?,
            estado = ?,
            total_estimado = ?
            WHERE id_orden = ?`,
            [
                id_cliente,
                id_tecnico || null,
                equipo,
                marca,
                modelo,
                numero_serie,
                accesorios_recibidos,
                problema_reportado,
                diagnostico,
                solucion,
                observaciones,
                fecha_entrega || null,
                estado,
                total_estimado || 0,
                id
            ]
        );

        res.json({
            ok: true,
            mensaje: "Orden actualizada correctamente"
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al actualizar orden",
            error: error.message
        });
    }
});

app.get("/api/facturas", verificarToken, async (req, res) => {
    try {
        const buscar = req.query.buscar || "";

        const [facturas] = await conexion.query(
            `SELECT 
                f.*,
                c.nombres AS cliente,
                CONCAT(u.nombre, ' ', u.apellido) AS usuario
            FROM facturas f
            INNER JOIN clientes c ON f.id_cliente = c.id_cliente
            INNER JOIN usuarios u ON f.id_usuario = u.id_usuario
            WHERE f.numero_factura LIKE ?
            OR c.nombres LIKE ?
            OR f.estado LIKE ?
            ORDER BY f.id_factura DESC`,
            [`%${buscar}%`, `%${buscar}%`, `%${buscar}%`]
        );

        res.json({ ok: true, datos: facturas });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al listar facturas",
            error: error.message
        });
    }
});

app.post("/api/facturas", verificarToken, async (req, res) => {
    const db = await conexion.getConnection();

    try {
        await db.beginTransaction();

        const {
            id_cliente,
            id_orden,
            descuento,
            metodo_pago,
            detalles
        } = req.body;

        if (!id_cliente || !Array.isArray(detalles) || detalles.length === 0) {
            await db.rollback();
            return res.status(400).json({
                ok: false,
                mensaje: "Debe seleccionar cliente y agregar detalles"
            });
        }

        const [[ultimo]] = await db.query(
            "SELECT COUNT(*) + 1 AS numero FROM facturas"
        );

        const numeroFactura = "FAC-" + String(ultimo.numero).padStart(6, "0");

        let subtotal = 0;
        let ivaTotal = 0;

        detalles.forEach(item => {
            const cantidad = Number(item.cantidad);
            const precio = Number(item.precio_unitario);
            const desc = Number(item.descuento || 0);
            const ivaPorcentaje = Number(item.iva || 0);

            const sub = cantidad * precio - desc;
            const ivaCalculado = sub * (ivaPorcentaje / 100);

            subtotal += sub;
            ivaTotal += ivaCalculado;
        });

        const descuentoFactura = Number(descuento || 0);
        const total = subtotal - descuentoFactura + ivaTotal;
        const estadoFactura = metodo_pago === "Pendiente" ? "Pendiente" : "Pagada";

        const [resultadoFactura] = await db.query(
            `INSERT INTO facturas
            (numero_factura, id_cliente, id_usuario, id_orden, subtotal, descuento, iva, total, metodo_pago, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                numeroFactura,
                id_cliente,
                req.usuario.id_usuario,
                id_orden || null,
                subtotal,
                descuentoFactura,
                ivaTotal,
                total,
                metodo_pago || "Pendiente",
                estadoFactura
            ]
        );

        const idFactura = resultadoFactura.insertId;

        for (const item of detalles) {
            const cantidad = Number(item.cantidad);
            const precio = Number(item.precio_unitario);
            const desc = Number(item.descuento || 0);
            const ivaPorcentaje = Number(item.iva || 0);
            const sub = cantidad * precio - desc;
            const ivaCalculado = sub * (ivaPorcentaje / 100);

            await db.query(
                `INSERT INTO detalle_factura
                (id_factura, tipo_item, id_producto, id_servicio, descripcion, cantidad, precio_unitario, descuento, iva, subtotal)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    idFactura,
                    item.tipo_item,
                    item.id_producto || null,
                    item.id_servicio || null,
                    item.descripcion,
                    cantidad,
                    precio,
                    desc,
                    ivaCalculado,
                    sub
                ]
            );

            if (item.tipo_item === "Producto" && item.id_producto) {
                await db.query(
                    "UPDATE productos SET stock = stock - ? WHERE id_producto = ?",
                    [cantidad, item.id_producto]
                );

                await db.query(
                    `INSERT INTO inventario_movimientos
                    (id_producto, tipo_movimiento, cantidad, motivo, id_usuario)
                    VALUES (?, 'Venta', ?, ?, ?)`,
                    [
                        item.id_producto,
                        cantidad,
                        `Venta en factura ${numeroFactura}`,
                        req.usuario.id_usuario
                    ]
                );
            }
        }

        await db.query(
            `INSERT INTO pagos
            (id_factura, metodo_pago, monto_pagado, saldo_pendiente, estado)
            VALUES (?, ?, ?, ?, ?)`,
            [
                idFactura,
                metodo_pago || "Pendiente",
                estadoFactura === "Pagada" ? total : 0,
                estadoFactura === "Pagada" ? 0 : total,
                estadoFactura === "Pagada" ? "Completo" : "Pendiente"
            ]
        );

        await db.commit();

        res.json({
            ok: true,
            mensaje: "Factura creada correctamente",
            numero_factura: numeroFactura,
            id_factura: idFactura
        });

    } catch (error) {
        await db.rollback();

        res.status(500).json({
            ok: false,
            mensaje: "Error al crear factura",
            error: error.message
        });

    } finally {
        db.release();
    }
});

app.put("/api/facturas/anular/:id", verificarToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo_anulacion } = req.body;

        if (!motivo_anulacion) {
            return res.status(400).json({
                ok: false,
                mensaje: "Debe ingresar el motivo de anulación"
            });
        }

        await conexion.query(
            `UPDATE facturas 
             SET estado = 'Anulada', motivo_anulacion = ?
             WHERE id_factura = ?`,
            [motivo_anulacion, id]
        );

        res.json({
            ok: true,
            mensaje: "Factura anulada correctamente"
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al anular factura",
            error: error.message
        });
    }
});

app.get("/api/pagos", verificarToken, async (req, res) => {
    try {
        const [pagos] = await conexion.query(
            `SELECT 
                p.*,
                f.numero_factura,
                f.total,
                c.nombres AS cliente
            FROM pagos p
            INNER JOIN facturas f ON p.id_factura = f.id_factura
            INNER JOIN clientes c ON f.id_cliente = c.id_cliente
            ORDER BY p.id_pago DESC`
        );

        res.json({ ok: true, datos: pagos });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al listar pagos",
            error: error.message
        });
    }
});

app.post("/api/pagos", verificarToken, async (req, res) => {
    try {
        const {
            id_factura,
            metodo_pago,
            monto_pagado
        } = req.body;

        const [[factura]] = await conexion.query(
            "SELECT total FROM facturas WHERE id_factura = ?",
            [id_factura]
        );

        if (!factura) {
            return res.status(404).json({
                ok: false,
                mensaje: "Factura no encontrada"
            });
        }

        const [[pagadoActual]] = await conexion.query(
            "SELECT IFNULL(SUM(monto_pagado), 0) AS pagado FROM pagos WHERE id_factura = ?",
            [id_factura]
        );

        const nuevoPagado = Number(pagadoActual.pagado) + Number(monto_pagado);
        const saldoPendiente = Number(factura.total) - nuevoPagado;

        let estadoPago = "Abono";
        let estadoFactura = "Pendiente";

        if (saldoPendiente <= 0) {
            estadoPago = "Completo";
            estadoFactura = "Pagada";
        }

        await conexion.query(
            `INSERT INTO pagos
            (id_factura, metodo_pago, monto_pagado, saldo_pendiente, estado)
            VALUES (?, ?, ?, ?, ?)`,
            [id_factura, metodo_pago, monto_pagado, Math.max(saldoPendiente, 0), estadoPago]
        );

        await conexion.query(
            "UPDATE facturas SET estado = ? WHERE id_factura = ?",
            [estadoFactura, id_factura]
        );

        res.json({
            ok: true,
            mensaje: "Pago registrado correctamente"
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al registrar pago",
            error: error.message
        });
    }
});

app.get("/api/garantias", verificarToken, async (req, res) => {
    try {
        const [garantias] = await conexion.query(
            `SELECT 
                g.*,
                f.numero_factura,
                c.nombres AS cliente
            FROM garantias g
            INNER JOIN facturas f ON g.id_factura = f.id_factura
            INNER JOIN clientes c ON g.id_cliente = c.id_cliente
            ORDER BY g.id_garantia DESC`
        );

        res.json({ ok: true, datos: garantias });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al listar garantías",
            error: error.message
        });
    }
});

app.post("/api/garantias", verificarToken, async (req, res) => {
    try {
        const {
            id_factura,
            id_cliente,
            descripcion,
            fecha_inicio,
            fecha_fin,
            condiciones
        } = req.body;

        if (!id_factura || !id_cliente || !descripcion || !fecha_inicio || !fecha_fin) {
            return res.status(400).json({
                ok: false,
                mensaje: "Complete los datos obligatorios de la garantía"
            });
        }

        await conexion.query(
            `INSERT INTO garantias
            (id_factura, id_cliente, descripcion, fecha_inicio, fecha_fin, condiciones, estado)
            VALUES (?, ?, ?, ?, ?, ?, 'Vigente')`,
            [id_factura, id_cliente, descripcion, fecha_inicio, fecha_fin, condiciones]
        );

        res.json({
            ok: true,
            mensaje: "Garantía registrada correctamente"
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al registrar garantía",
            error: error.message
        });
    }
});

app.get("/api/inventario", verificarToken, async (req, res) => {
    try {
        const [movimientos] = await conexion.query(
            `SELECT 
                i.*,
                p.codigo,
                p.nombre AS producto,
                CONCAT(u.nombre, ' ', u.apellido) AS usuario
            FROM inventario_movimientos i
            INNER JOIN productos p ON i.id_producto = p.id_producto
            LEFT JOIN usuarios u ON i.id_usuario = u.id_usuario
            ORDER BY i.id_movimiento DESC`
        );

        res.json({ ok: true, datos: movimientos });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al listar inventario",
            error: error.message
        });
    }
});

app.post("/api/inventario", verificarToken, async (req, res) => {
    const db = await conexion.getConnection();

    try {
        await db.beginTransaction();

        const {
            id_producto,
            tipo_movimiento,
            cantidad,
            motivo
        } = req.body;

        if (!id_producto || !tipo_movimiento || !cantidad) {
            await db.rollback();
            return res.status(400).json({
                ok: false,
                mensaje: "Complete los datos del movimiento"
            });
        }

        await db.query(
            `INSERT INTO inventario_movimientos
            (id_producto, tipo_movimiento, cantidad, motivo, id_usuario)
            VALUES (?, ?, ?, ?, ?)`,
            [id_producto, tipo_movimiento, cantidad, motivo, req.usuario.id_usuario]
        );

        if (tipo_movimiento === "Entrada") {
            await db.query(
                "UPDATE productos SET stock = stock + ? WHERE id_producto = ?",
                [cantidad, id_producto]
            );
        } else {
            await db.query(
                "UPDATE productos SET stock = stock - ? WHERE id_producto = ?",
                [cantidad, id_producto]
            );
        }

        await db.commit();

        res.json({
            ok: true,
            mensaje: "Movimiento de inventario registrado correctamente"
        });

    } catch (error) {
        await db.rollback();

        res.status(500).json({
            ok: false,
            mensaje: "Error al registrar movimiento",
            error: error.message
        });

    } finally {
        db.release();
    }
});

app.get("/api/reportes", verificarToken, async (req, res) => {
    try {
        const fechaInicio = req.query.fechaInicio || "2000-01-01";
        const fechaFin = req.query.fechaFin || "2999-12-31";

        const [ventasPorFecha] = await conexion.query(
            `SELECT 
                DATE(fecha_emision) AS fecha,
                COUNT(*) AS facturas,
                IFNULL(SUM(total), 0) AS total
            FROM facturas
            WHERE DATE(fecha_emision) BETWEEN ? AND ?
            AND estado != 'Anulada'
            GROUP BY DATE(fecha_emision)
            ORDER BY fecha DESC`,
            [fechaInicio, fechaFin]
        );

        const [productosVendidos] = await conexion.query(
            `SELECT 
                descripcion,
                SUM(cantidad) AS cantidad,
                SUM(subtotal) AS total
            FROM detalle_factura
            WHERE tipo_item = 'Producto'
            GROUP BY descripcion
            ORDER BY cantidad DESC
            LIMIT 10`
        );

        const [serviciosSolicitados] = await conexion.query(
            `SELECT 
                descripcion,
                SUM(cantidad) AS cantidad,
                SUM(subtotal) AS total
            FROM detalle_factura
            WHERE tipo_item = 'Servicio'
            GROUP BY descripcion
            ORDER BY cantidad DESC
            LIMIT 10`
        );

        const [stockBajo] = await conexion.query(
            `SELECT codigo, nombre, stock, stock_minimo
             FROM productos
             WHERE stock <= stock_minimo
             AND estado = 'Activo'`
        );

        const [ordenesEstado] = await conexion.query(
            `SELECT estado, COUNT(*) AS total
             FROM ordenes_servicio
             GROUP BY estado`
        );

        const [pagosPendientes] = await conexion.query(
            `SELECT 
                f.numero_factura,
                c.nombres AS cliente,
                f.total,
                IFNULL(SUM(p.monto_pagado), 0) AS pagado,
                f.total - IFNULL(SUM(p.monto_pagado), 0) AS pendiente
            FROM facturas f
            INNER JOIN clientes c ON f.id_cliente = c.id_cliente
            LEFT JOIN pagos p ON f.id_factura = p.id_factura
            WHERE f.estado = 'Pendiente'
            GROUP BY f.id_factura`
        );

        res.json({
            ok: true,
            datos: {
                ventasPorFecha,
                productosVendidos,
                serviciosSolicitados,
                stockBajo,
                ordenesEstado,
                pagosPendientes
            }
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al generar reportes",
            error: error.message
        });
    }
});

app.get("/api/configuracion", verificarToken, async (req, res) => {
    try {
        const [[empresa]] = await conexion.query(
            "SELECT * FROM empresa LIMIT 1"
        );

        const [[configuracion]] = await conexion.query(
            "SELECT * FROM configuracion LIMIT 1"
        );

        res.json({
            ok: true,
            datos: {
                empresa,
                configuracion
            }
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al cargar configuración",
            error: error.message
        });
    }
});

app.put("/api/configuracion", verificarToken, async (req, res) => {
    try {
        const {
            nombre_empresa,
            nombre_comercial,
            logo,
            ruc,
            direccion,
            telefono,
            correo,
            iva,
            datos_factura,
            color_principal,
            color_secundario,
            color_fondo,
            color_texto,
            modo,
            moneda
        } = req.body;

        await conexion.query(
            `UPDATE empresa SET
            nombre_empresa = ?,
            nombre_comercial = ?,
            logo = ?,
            ruc = ?,
            direccion = ?,
            telefono = ?,
            correo = ?,
            iva = ?,
            datos_factura = ?
            WHERE id_empresa = 1`,
            [nombre_empresa, nombre_comercial, logo, ruc, direccion, telefono, correo, iva, datos_factura]
        );

        await conexion.query(
            `UPDATE configuracion SET
            color_principal = ?,
            color_secundario = ?,
            color_fondo = ?,
            color_texto = ?,
            modo = ?,
            moneda = ?
            WHERE id_configuracion = 1`,
            [color_principal, color_secundario, color_fondo, color_texto, modo, moneda]
        );

        res.json({
            ok: true,
            mensaje: "Configuración actualizada correctamente"
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: "Error al actualizar configuración",
            error: error.message
        });
    }
});

app.get("/api/select/clientes", verificarToken, async (req, res) => {
    try {
        const [clientes] = await conexion.query(
            "SELECT id_cliente, nombres, identificacion FROM clientes WHERE estado = 'Activo' ORDER BY nombres ASC"
        );

        res.json({ ok: true, datos: clientes });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: error.message
        });
    }
});

app.get("/api/select/productos", verificarToken, async (req, res) => {
    try {
        const [productos] = await conexion.query(
            "SELECT id_producto, codigo, nombre, precio_venta, stock, iva FROM productos WHERE estado = 'Activo' ORDER BY nombre ASC"
        );

        res.json({ ok: true, datos: productos });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: error.message
        });
    }
});

app.get("/api/select/servicios", verificarToken, async (req, res) => {
    try {
        const [servicios] = await conexion.query(
            "SELECT id_servicio, nombre, precio, garantia_dias FROM servicios WHERE estado = 'Activo' ORDER BY nombre ASC"
        );

        res.json({ ok: true, datos: servicios });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: error.message
        });
    }
});

app.get("/api/select/tecnicos", verificarToken, async (req, res) => {
    try {
        const [tecnicos] = await conexion.query(
            `SELECT 
                u.id_usuario,
                CONCAT(u.nombre, ' ', u.apellido) AS tecnico
            FROM usuarios u
            INNER JOIN roles r ON u.id_rol = r.id_rol
            WHERE r.nombre IN ('Técnico', 'Administrador')
            AND u.estado = 'Activo'
            ORDER BY u.nombre ASC`
        );

        res.json({ ok: true, datos: tecnicos });

    } catch (error) {
        res.status(500).json({
            ok: false,
            mensaje: error.message
        });
    }
});

app.listen(PORT, () => console.log(`Servidor en puerto ${PORT}`));