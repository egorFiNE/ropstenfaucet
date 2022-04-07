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

Edit `backend/.env`. Make sure to put the private key of the faucet address. Then:

```bash
cd backend
npm run dev
```

## Contract

See `contracts/`. It's a typical hardhat file structure. Currently used contract is deployed on Ropsten at `0x7917A2F6c13E1e13452F0D52157E5aFaD999D36B`.
