Continuar ideia de buscar generos, nao vem nenhum genero tenta filtrar de outra forma. - ok

Colocar assistido em cada anime - ok


Criar logo - ok
Escrever rodapé - ok
mudar cor dos botoes - ok


historico ir direto para episodio com modal aberto - ok

legenda em todos os episodios - ok
limitar quantidade de episodios que aparecem - ok
filtro animedetails de episdoios pro ordem crescente ou decrescente - ok
melhorar layout modal episodio - ok

traduzir generos - ok
traduzir descrição - ok

limpar filtro voltar aos populares - ok
Mostrar em home tag de assistido - ok

pular abertura e necerramento - ok
botao proximo episodio dentro do episodio - ok



trocar nome - ok

problemas ao carregar episdoio vindo do historico - ok

traduzindo legendas
melhorando videoplayer( 10 segundos passar) - ok



************** progresso manga salvar -ok
progresso do mangá lido - ok
historico de manga lido - ok

Melhorar perfil, inserindo mangas e seprando corretamente - ok

Imagem padrão - ok


Criar chat com ia - ok
Abrir conta google genimi ai -

sair  remover @userAnime - ok

Fazer tudo funcionar na nova api - ok

Puxar genero - ok
Puxar faixa etaria - ok
puxar nota - ok

Puxar todos os animes de x genero - ok
Puxar episdoio - ok

Conferir - Salvar progresso episodio - ok
abrir hostorico e ja ir rodando da onde parou - ok

Subir: 
Criar uma VM no Google Cloud

No Console do Google Cloud, vá para "Compute Engine" > "Instâncias de VM"
Clique em "Criar Instância"
Configure sua VM:

Nome: algo como "suki-sekai-api"
Região/Zona: escolha uma próxima aos seus usuários
Tipo de máquina: para começar, "e2-small" (2 vCPUs, 2 GB de memória) deve ser suficiente
Sistema operacional: Ubuntu 20.04 LTS
Permitir tráfego HTTP e HTTPS


Clique em "Criar"

sudo apt update
sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v

sudo apt install git -y

Implantar seu código
Existem algumas maneiras de fazer isso:
Opção 1: Usar o Git
Se seu código estiver em um repositório Git:
bashgit clone https://seu-repositorio/suki-sekai-api.git
cd suki-sekai-api
npm install

Configurar o ambiente para execução contínua
Para manter sua API rodando mesmo após você fechar a conexão SSH, você pode usar o PM2:
bash# Instale o PM2 globalmente
sudo npm install -g pm2

# Inicie sua aplicação
cd suki-sekai-api
pm2 start src/index.js --name suki-sekai-api

# Configure o PM2 para iniciar com o sistema
pm2 startup
sudo env PATH=$PATH:/usr/bin pm2 startup ubuntu -u $(whoami) --hp $(echo $HOME)
pm2 save