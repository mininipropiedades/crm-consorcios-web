import { NextResponse } from "next/server";
import { verifyPassword, createSession } from "@/lib/auth";
import { z } from "zod";

const Schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    const user = await verifyPassword(parsed.data.email, parsed.data.password);
    if (!user) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }
    await createSession({
      sub: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
