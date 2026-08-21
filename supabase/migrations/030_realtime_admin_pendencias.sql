-- Publica as três filas de pendência no Realtime, para os contadores do painel
-- administrativo subirem sozinhos.
--
-- Até aqui os contadores só se atualizavam em resposta à ação do próprio
-- admin (ver revalidatePath nas actions de revisão). Quando é outra pessoa que
-- cria a pendência — um médium sugerindo uma erva, mandando uma mensagem de
-- suporte ou pedindo permissão para registrar — nada avisava o navegador do
-- admin, e o badge só subia no reload seguinte. Numa fase de testes fechada,
-- em que o pedido costuma vir junto de um "manda lá que eu aprovo", esperar o
-- reload é justamente o momento em que o painel parece quebrado.
--
-- Mesmo mecanismo que a migration 018 já usa para `notifications`. As três
-- tabelas têm RLS com policy de select que libera o admin a ver tudo, e o
-- Realtime avalia essa policy por assinante — então o evento só chega a quem
-- já podia ler a linha por HTTP. Como a autorização do admin nessas policies
-- é um EXISTS em profiles.is_admin, e não depende de coluna nenhuma da linha,
-- a identidade de réplica padrão (chave primária) basta: não é preciso
-- REPLICA IDENTITY FULL, que só engordaria o WAL dessas tabelas.

do $$
declare
  _tabela text;
begin
  foreach _tabela in array array['species', 'support_messages', 'occurrence_permission_requests']
  loop
    -- Idempotente: reaplicar a migration não pode falhar por já estar publicada.
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = _tabela
    ) then
      execute format('alter publication supabase_realtime add table public.%I', _tabela);
    end if;
  end loop;
end;
$$;
