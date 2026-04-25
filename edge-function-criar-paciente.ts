// Edge Function: criar-paciente
// Cria usuário no Supabase Auth usando service_role (seguro, server-side)
// Nunca expõe a service_role key no frontend

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL      = 'https://gqnlrhmriufepzpustna.supabase.co';
const SERVICE_ROLE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdxbmxyaG1yaXVmZXB6cHVzdG5hIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDk2NDEwMCwiZXhwIjoyMDkwNTQwMTAwfQ.A4EOWYg5-nbl2VL2L3cPFXs6PDIkztbgtPAjmyyNzgk';

const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Allow-Methods': 'POST',
      }
    });
  }

  try {
    const {
      email, senha, nome,
      plano_url, data_ultima_consulta, data_proxima_consulta,
      observacoes, metas,
      telefone, sexo, data_nascimento,
      preferencia_alimentar, restricoes_alimentares,
      // Perfil nutricional completo
      estilo_alimentar, condicoes_clinicas, objetivo,
      estrategia_nutricional, consistencia, fase_da_vida,
    } = await req.json();

    if (!email || !senha || !nome) {
      return Response.json({ error: 'Email, senha e nome são obrigatórios.' }, { status: 400 });
    }

    // Cria usuário no Auth usando service_role — funciona mesmo com signups desativados
    const { data: userData, error: userError } = await adminClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true, // confirma automaticamente sem precisar de e-mail
    });

    if (userError) {
      return Response.json({ error: userError.message }, { status: 400 });
    }

    const userId = userData.user.id;

    // Insere na tabela patients
    const { error: dbError } = await adminClient
      .from('patients')
      .insert({
        user_id:                userId,
        nome,
        email,
        plano_url:              plano_url || null,
        data_ultima_consulta:   data_ultima_consulta || null,
        data_proxima_consulta:  data_proxima_consulta || null,
        observacoes:            observacoes || null,
        metas:                  metas || null,
        telefone:               telefone || null,
        sexo:                   sexo || null,
        data_nascimento:        data_nascimento || null,
        preferencia_alimentar:  preferencia_alimentar || 'onivora',
        restricoes_alimentares: Array.isArray(restricoes_alimentares) ? restricoes_alimentares : [],
        estilo_alimentar:       estilo_alimentar || 'onivoro',
        condicoes_clinicas:     Array.isArray(condicoes_clinicas) ? condicoes_clinicas : [],
        objetivo:               objetivo || null,
        estrategia_nutricional: estrategia_nutricional || null,
        consistencia:           consistencia || 'normal',
        fase_da_vida:           fase_da_vida || 'adulto',
      });

    if (dbError) {
      // Reverte criação do usuário se falhar no banco
      await adminClient.auth.admin.deleteUser(userId);
      return Response.json({ error: dbError.message }, { status: 500 });
    }

    return Response.json({ success: true, user_id: userId }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return Response.json({ error: 'Erro interno: ' + err.message }, { status: 500 });
  }
});
