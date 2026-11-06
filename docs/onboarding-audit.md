# Auditoria de onboarding — U.R. Charneca Atletismo

Data: 2026-11-06 · App: https://rpmariano.github.io/URCharneca/ · Percorrida a 390 px como atleta sem crianças (Francisco Guerra, Pedro Baleia) e como administrador (Rui Mariano), com os dados de exemplo.

## Primeira impressão: 3/5 antes, 4/5 depois
Antes, um atleta novo via a página Explorar com muita informação (comunicado, provas, treinos) mas **nada que dissesse o que fazer primeiro**. O caminho até à primeira inscrição (tocar num cartão → "Inscrever" → escolher distância e transporte) não estava explicado em lado nenhum.

## O que já estava bem
- Estados vazios com ícone, título, texto e ação em Inscrições, Comunicados e nos resultados de pesquisa.
- Perfil explica as crianças ("até 2 adultos responsáveis", "provas abertas a crianças").
- Os formulários dizem que o pedido fica pendente até o clube confirmar.

## Lacunas encontradas e o que foi feito
| Onde | Lacuna | Prioridade | Feito |
|---|---|---|---|
| Explorar | Sem boas-vindas nem "por onde começar" | Alta | Cartão "Bem-vindo" com 3 passos, um para atletas e outro para administradores; dispensável |
| Folha de inscrição | Opções de transporte sem explicação ("ponto de encontro", "só regresso", "dou boleia") | Alta | Texto por baixo do seletor que muda com a opção escolhida |
| Prova → A minha inscrição | "Aguarda o clube" não diz o que acontece a seguir | Alta | Linha a explicar o estado (quem confirma e onde se avisa) |
| Explorar → categorias | "Troféu", "Clube" e "Sugeridas" sem definição | Média | Descrição por baixo do título da lista de cada categoria |
| Prova (admin) | Seleção de inscrições e dorsais descobrível só por acaso | Média | Dica "Escolhe inscrições com a caixa à esquerda…", dispensável |
| Perfil | Impossível voltar a ver o guia | Média | "Ver o guia outra vez" repõe boas-vindas e dicas |

## Corrigido depois da auditoria
- **Cancelar** pede confirmação (mais séria se o clube já tinha confirmado) e, quando a inscrição estava confirmada, o dorsal já estava no clube ou um lugar da carrinha é libertado, **avisa a equipa** com um comunicado ("Cancelamento: …") e diz quem sobe da lista de espera.
- **Prazo e data da prova** passam a ser verificados na própria função de inscrever e de cancelar, não só na interface.
- **Fila da carrinha**: conta a partir do momento em que se pede lugar (`van_requested_at`), por isso mudar de "meios próprios" para carrinha já não passa à frente de quem pediu antes.
- **Filtros**: o botão tem agora o texto "Filtros" (o calendário já tinha texto).
- **Glossário** em Perfil: escalão, Troféu de Cascais, prova do clube e sugerida, "Aguarda o clube", dorsal, carrinha e lista de espera, ponto de encontro e prazo.

## Por tratar
- A troca de utilizador está em Perfil → Demonstração. Com autenticação real, o primeiro ecrã passa a ser o de entrada e este guia deve vir depois dele.
- Um teste com utilizadores reais diria se as explicações bastam.

## Como funciona o guia
- Guarda no dispositivo (`localStorage`, chave `urc_onboarding_v1`) o que já foi dispensado: `welcome-athlete`, `welcome-admin`, `admin-select`.
- Código: `src/utils/onboarding.ts` (hook `useOnboardingItem`), `src/components/OnboardingCards.tsx` (`WelcomeCard`, `ContextualHint`).
