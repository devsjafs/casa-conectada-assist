

# Plano: Gerar APK Nativo com Capacitor

## O que vamos fazer

Vamos configurar o projeto para que voce consiga gerar um APK (aplicativo Android) a partir do seu app web usando o **Capacitor** -- uma ferramenta que "empacota" seu site dentro de um app nativo.

---

## Etapa 1 -- Preparar o projeto (feito pelo Lovable)

Vou fazer as seguintes alteracoes no codigo:

1. **Instalar dependencias do Capacitor**: `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`
2. **Criar o arquivo `capacitor.config.ts`** com as configuracoes do app:
   - Nome do app: **casa-conectada-assist**
   - ID do app: `app.lovable.f6b4cd3f323948c0841a62bf55fcdf48`
   - Modo de desenvolvimento com hot-reload apontando para o preview do Lovable
3. **Atualizar o `index.html`** com titulo e meta tags adequadas para mobile

---

## Etapa 2 -- Gerar o APK (feito por voce no seu computador)

Depois que eu fizer as alteracoes acima, voce vai precisar seguir estes passos no seu computador:

### Pre-requisitos
- **Android Studio** instalado ([baixar aqui](https://developer.android.com/studio))
- **Node.js** instalado

### Passo a passo

```text
1. Exporte o projeto para o GitHub
   (Configuracoes -> GitHub -> "Export to GitHub")

2. Clone o repositorio no seu computador
   git clone <URL_DO_SEU_REPOSITORIO>
   cd <NOME_DO_PROJETO>

3. Instale as dependencias
   npm install

4. Adicione a plataforma Android
   npx cap add android

5. Atualize as dependencias nativas
   npx cap update android

6. Faca o build do projeto
   npm run build

7. Sincronize com o Android
   npx cap sync

8. Abra no Android Studio
   npx cap open android

9. No Android Studio:
   - Menu: Build -> Build Bundle(s) / APK(s) -> Build APK(s)
   - O APK sera gerado em:
     android/app/build/outputs/apk/debug/app-debug.apk

10. Transfira o APK para seu celular e instale!
```

**Importante:** No celular, voce vai precisar habilitar "Instalar de fontes desconhecidas" nas configuracoes para conseguir instalar o APK.

---

## Detalhes tecnicos

| Item | Valor |
|------|-------|
| App ID | `app.lovable.f6b4cd3f323948c0841a62bf55fcdf48` |
| App Name | `casa-conectada-assist` |
| WebDir | `dist` (saida do build do Vite) |
| Hot-reload URL | `https://f6b4cd3f-3239-48c0-841a-62bf55fcdf48.lovableproject.com?forceHideBadge=true` |

### Arquivos que serao criados/editados:
- **Criar**: `capacitor.config.ts` -- configuracao do Capacitor
- **Editar**: `package.json` -- adicionar dependencias do Capacitor
- **Editar**: `index.html` -- melhorar titulo e meta tags para mobile

### Nota sobre hot-reload
Durante o desenvolvimento, o app no celular vai carregar diretamente do preview do Lovable (via URL). Para gerar o APK final de producao, voce pode remover a configuracao `server.url` do `capacitor.config.ts` para que o app use os arquivos locais (build).

