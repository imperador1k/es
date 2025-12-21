-- Função RPC para eliminar conta do utilizador de forma segura
-- Deve ser executado no Supabase SQL Editor

-- 1. Criar função para apagar conta
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Obter o ID do utilizador autenticado
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Utilizador não autenticado';
  END IF;

  -- Apagar dados em cascata (ordem importante por causa das foreign keys)
  
  -- 1. Mensagens DM
  DELETE FROM dm_messages WHERE sender_id = current_user_id;
  DELETE FROM dm_messages WHERE conversation_id IN (
    SELECT id FROM dm_conversations 
    WHERE user1_id = current_user_id OR user2_id = current_user_id
  );
  
  -- 2. Conversas DM
  DELETE FROM dm_conversations 
  WHERE user1_id = current_user_id OR user2_id = current_user_id;
  
  -- 3. Amizades
  DELETE FROM friendships 
  WHERE requester_id = current_user_id OR addressee_id = current_user_id;
  
  -- 4. Mensagens de canais
  DELETE FROM messages WHERE user_id = current_user_id;
  
  -- 5. Membros de equipas
  DELETE FROM team_members WHERE user_id = current_user_id;
  
  -- 6. Equipas onde é owner (transferir ou apagar)
  DELETE FROM teams WHERE owner_id = current_user_id;
  
  -- 7. Tarefas
  DELETE FROM tasks WHERE user_id = current_user_id;
  
  -- 8. Badges do utilizador
  DELETE FROM user_badges WHERE user_id = current_user_id;
  
  -- 9. Inventário
  DELETE FROM user_inventory WHERE user_id = current_user_id;
  
  -- 10. Histórico XP
  DELETE FROM xp_history WHERE user_id = current_user_id;
  
  -- 11. Push tokens
  DELETE FROM user_push_tokens WHERE user_id = current_user_id;
  
  -- 12. Perfil (por último)
  DELETE FROM profiles WHERE id = current_user_id;
  
  -- NOTA: O utilizador em auth.users será eliminado pelo Supabase
  -- quando a sessão expirar ou pode ser feito via Edge Function
  
END;
$$;

-- Dar permissão para utilizadores autenticados executarem
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
