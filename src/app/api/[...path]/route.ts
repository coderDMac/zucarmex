import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { session } from '@/lib/auth';
import { localDemoEnabled, hasSupabase } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import {
  createSchedule,
  manageSchedule,
  saveProduct,
  saveProfile,
  simulatePayment,
  submitOrder,
  updateOrder,
} from '@/lib/order-service';
export const runtime = 'nodejs';
export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const origin = req.headers.get('origin');
  if (origin && new URL(origin).host !== req.headers.get('host'))
    return NextResponse.json({ error: 'Origen no permitido.' }, { status: 403 });
  try {
    const { path } = await params;
    const [route, id, action] = path;
    const body = await req.json();
    if (route === 'login') {
      if (!hasSupabase)
        return NextResponse.json(
          { error: 'Configura Supabase para utilizar autenticación real.' },
          { status: 503 },
        );
      if (
        typeof body.email !== 'string' ||
        typeof body.password !== 'string' ||
        body.email.length > 254 ||
        body.password.length > 256
      )
        return NextResponse.json({ error: 'Revisa tu correo y contraseña.' }, { status: 400 });
      const db = await supabaseServer();
      const { data, error } = await db.auth.signInWithPassword({
        email: body.email.trim(),
        password: body.password,
      });
      if (error || !data.user)
        return NextResponse.json(
          { error: 'Correo o contraseña incorrectos. Intenta de nuevo.' },
          { status: 401 },
        );
      const { data: profile } = await db
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();
      if (!profile) {
        await db.auth.signOut();
        return NextResponse.json(
          { error: 'Tu perfil no está habilitado. Contacta a tu asesor.' },
          { status: 403 },
        );
      }
      return NextResponse.json({ redirect: profile.role === 'admin' ? '/admin' : '/portal' });
    }
    if (route === 'demo') {
      if (!localDemoEnabled)
        return NextResponse.json(
          { error: 'La demostración local está deshabilitada.' },
          { status: 403 },
        );
      if (!['client', 'admin'].includes(body.role)) throw new Error('Selecciona un perfil.');
      (await cookies()).set('zuc-demo-role', body.role, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 8,
      });
      return NextResponse.json({ redirect: body.role === 'admin' ? '/admin' : '/portal' });
    }
    if (route === 'logout') {
      if (hasSupabase) {
        const db = await supabaseServer();
        await db.auth.signOut();
      }
      (await cookies()).delete('zuc-demo-role');
      return NextResponse.json({ redirect: '/login' });
    }
    const auth = await session();
    if (!auth)
      return NextResponse.json(
        { error: 'Tu sesión terminó. Inicia sesión de nuevo.' },
        { status: 401 },
      );
    let result: unknown;
    if (route === 'orders' && !id) result = await submitOrder(body);
    else if (route === 'orders' && id && action === 'admin') result = await updateOrder(id, body);
    else if (route === 'orders' && id && action === 'payment')
      result = await simulatePayment(id, body.method);
    else if (route === 'orders' && id && action === 'schedule')
      result = await createSchedule(id, body.frequency, body.next_due_date);
    else if (route === 'schedules' && id) result = await manageSchedule(id, body.action);
    else if (route === 'products' && id) result = await saveProduct(id, body);
    else if (route === 'profile') result = await saveProfile(body);
    else return NextResponse.json({ error: 'Operación no encontrada.' }, { status: 404 });
    revalidatePath('/portal', 'layout');
    revalidatePath('/admin', 'layout');
    return NextResponse.json({ ok: true, id: result ?? null });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudo completar la operación. Intenta de nuevo.',
      },
      { status: 400 },
    );
  }
}
