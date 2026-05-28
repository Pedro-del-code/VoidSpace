# 🚀 Void Striker — Space Shooter

Space shooter estético com visual neon/sci-fi, suporte mobile completo e deploy no Render.

## Stack
- **Backend**: Python + Flask
- **Frontend**: HTML5 Canvas + JavaScript vanilla
- **Deploy**: Render (gunicorn)

## Rodar localmente

```bash
pip install -r requirements.txt
python app.py
# Acesse http://localhost:5000
```

## Deploy no Render

1. Faça push do projeto para um repositório GitHub
2. Acesse [render.com](https://render.com) → New → Web Service
3. Conecte o repositório
4. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2`
   - **Environment**: Python 3
5. Clique em **Deploy**

Ou use o arquivo `render.yaml` para deploy automático com Infrastructure as Code.

## Controles

| Plataforma | Mover | Atirar |
|---|---|---|
| Mobile | Arrastar o dedo | Toque rápido |
| Teclado | WASD / Setas | Espaço / Z |

### Botão AUTOFIRE (mobile)
Ativa disparo automático contínuo — útil para focar apenas na movimentação.

## Mecânicas
- Ondas progressivas de inimigos (mais difícil a cada wave)
- 3 tipos de inimigos (básico, atirador, elite)
- 3 vidas com invencibilidade temporária ao tomar dano
- Recorde salvo localmente (localStorage)
- Efeitos sonoros via Web Audio API
- Partículas de explosão + glow neon
