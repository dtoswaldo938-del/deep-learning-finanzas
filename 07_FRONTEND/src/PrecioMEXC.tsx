
import { useEffect, useState } from "react";

type PrecioMEXCData = {
  status: string;
  fuente: string;
  activo: string;
  precio: number;
  fecha_consulta_utc: string;
  operaciones_reales: boolean;
};

export default function PrecioMEXC() {
  const [datos, setDatos] = useState<PrecioMEXCData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    let controlador: AbortController | null = null;
    let temporizador: ReturnType<typeof setTimeout>;

    async function actualizarPrecio() {
      controlador = new AbortController();

      try {
        const respuesta = await fetch(
          "http://127.0.0.1:8001/api/mexc/precio-actual",
          { signal: controlador.signal, cache: "no-store" }
        );

        if (!respuesta.ok) {
          throw new Error("No fue posible consultar MEXC.");
        }

        const resultado: PrecioMEXCData = await respuesta.json();

        if (activo) {
          setDatos(resultado);
          setError(null);
        }
      } catch (err) {
        if (activo && !(err instanceof Error && err.name === "AbortError")) {
          setError("Sin conexión con MEXC o FastAPI.");
        }
      } finally {
        if (activo) {
          temporizador = setTimeout(actualizarPrecio, 1000);
        }
      }
    }

    actualizarPrecio();

    return () => {
      activo = false;
      controlador?.abort();
      clearTimeout(temporizador);
    };
  }, []);

  return (
    <section style={{
      background: "#111827",
      color: "#ffffff",
      padding: "24px",
      borderRadius: "16px",
      marginBottom: "24px"
    }}>
      <h2>Precio de Bitcoin · MEXC</h2>

      {datos && !error ? (
        <>
          <h1 style={{ color: "#38bdf8", fontSize: "36px" }}>
            {datos.precio.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })} USDT
          </h1>

          <p>Activo: {datos.activo}</p>
          <p>Fuente: {datos.fuente}</p>
          <p>
            Última consulta:{" "}
            {new Date(datos.fecha_consulta_utc).toLocaleString("es-MX")}
          </p>
          <p>Actualización automática aproximada cada segundo</p>
        </>
      ) : !error ? (
        <p>Consultando MEXC...</p>
      ) : null}

      {error && (
        <p style={{ color: "#f87171" }}>
          {error} {datos && "El último precio recibido puede estar desactualizado."}
        </p>
      )}
    </section>
  );
}
