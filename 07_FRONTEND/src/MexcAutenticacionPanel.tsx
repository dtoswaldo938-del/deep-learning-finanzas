import { useEffect, useState } from "react";

type EstadoConexion = {
  estado: string;
  proveedor: string;
  tipo_conexion: string;
  credenciales_reales: boolean;
  operaciones_reales: boolean;
  fecha_utc: string;
};

export default function MexcAutenticacionPanel() {
  const [datos, setDatos] = useState<EstadoConexion | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    async function consultar() {
      try {
        const respuesta = await fetch(
          "/api/integracion-mexc/estado"
        );

        if (!respuesta.ok) {
          throw new Error("No se pudo consultar la integración");
        }

        const resultado: EstadoConexion = await respuesta.json();

        if (activo) {
          setDatos(resultado);
          setError("");
        }
      } catch {
        if (activo) {
          setError("No se pudo consultar la autenticación simulada.");
        }
      }
    }

    consultar();
    const intervalo = setInterval(consultar, 30000);

    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, []);

  const conectado =
    datos?.estado === "simulacion_correcta" &&
    datos?.credenciales_reales === false &&
    datos?.operaciones_reales === false;

  return (
    <section
      style={{
        background: "#101d35",
        border: "1px solid #334155",
        borderRadius: 16,
        padding: 20,
        marginTop: 16,
        marginBottom: 16,
        color: "#f8fafc",
      }}
    >
      <h3 style={{ marginTop: 0 }}>
        Autenticación MEXC — Entorno de prueba
      </h3>

      <p>
        Estado:{" "}
        <strong style={{ color: conectado ? "#86efac" : "#fbbf24" }}>
          {error
            ? "ERROR"
            : conectado
              ? "SIMULACIÓN CORRECTA"
              : "VERIFICANDO"}
        </strong>
      </p>

      {datos && (
        <>
          <p>Proveedor: {datos.proveedor}</p>
          <p>Tipo: Autenticación simulada</p>
          <p>Credenciales reales: No</p>
          <p>Operaciones reales: No</p>
          <p>
            Última comprobación:{" "}
            {new Date(datos.fecha_utc).toLocaleString("es-MX")}
          </p>
        </>
      )}

      {error && <p style={{ color: "#fca5a5" }}>{error}</p>}

      <p style={{ color: "#94a3b8", fontSize: 13 }}>
        La conexión pública proporciona precios de MEXC.
        Esta autenticación es simulada y no accede a una cuenta
        privada. Las operaciones se realizan en Paper Trading.
      </p>
    </section>
  );
}
