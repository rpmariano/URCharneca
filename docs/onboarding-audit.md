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

## Por tratar
- **Cancelar** não pede confirmação nem avisa o clube; cancelar uma inscrição confirmada devia pedir confirmação e avisar o admin.
- O botão de filtros (ícone) e o do calendário não têm explicação além do rótulo acessível; um teste com utilizadores diria se bastam.
- A troca de utilizador está em Perfil → Demonstração. Com autenticação real, o primeiro ecrã passa a ser o de entrada e este guia deve vir depois dele.
- Os termos "escalão", "dorsal" e "Troféu de Cascais" são familiares à equipa; se a app abrir a pais de crianças que nunca correram, convém um glossário.

## Como funciona o guia
- Guarda no dispositivo (`localStorage`, chave `urc_onboarding_v1`) o que já foi dispensado: `welcome-athlete`, `welcome-admin`, `admin-select`.
- Código: `src/utils/onboarding.ts` (hook `useOnboardingItem`), `src/components/OnboardingCards.tsx` (`WelcomeCard`, `ContextualHint`).
