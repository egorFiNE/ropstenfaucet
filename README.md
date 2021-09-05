# Ropsten testnet faucet

Source code for https://faucet.egorfine.com.

## Run frontend

```bash
cd frontend/
npm install
npm run dev
```

## Run backend

```bash
cd backend
npm install
cp .env_example .env
```

Edit `backend/.env`. Make sure to put the private key of the faucet address. ThenL

```bash
cd backend
npm run dev
```

