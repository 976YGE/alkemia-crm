import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TestConnectionRequest {
  host: string;
  port: number;
  username: string;
  password: string;
}

async function testTCPConnection(host: string, port: number): Promise<boolean> {
  try {
    const conn = await Deno.connect({ hostname: host, port, transport: "tcp" });
    conn.close();
    return true;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { host, port, username, password }: TestConnectionRequest = await req.json();

    if (!host || !port || !username || !password) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Tous les champs sont requis",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const canConnect = await testTCPConnection(host, port);

    if (!canConnect) {
      return new Response(
        JSON.stringify({
          success: false,
          message: `Impossible de se connecter à ${host}:${port}. Vérifiez l'hôte et le port.`,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Connexion TCP réussie à ${host}:${port}. Le serveur est accessible.`,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : "Erreur lors du test de connexion",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
