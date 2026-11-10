# WealthFlow: Modular Personal Wealth & Insurance Platform

Production-grade personal finance, wealth tracking, and tax calculation platform.

## Quick Start

### Option 1: Start Server directly with Node (Recommended)
```bash
node preview_server.js
```
or via npm:
```bash
npm start
```

### Option 2: Start with development runner
```bash
./bin/dev-server
```
or
```bash
./bin/dev
```

Once running, visit:
- **Command Center / Overview:** [http://localhost:3000/](http://localhost:3000/)
- **Income Tax & ITR Calculator:** [http://localhost:3000/tax_calculator](http://localhost:3000/tax_calculator)
- **Investments & Mutual Funds:** [http://localhost:3000/mutual_funds](http://localhost:3000/mutual_funds)
- **Fixed Income (FD/RD/Flexi):** [http://localhost:3000/fixed_income](http://localhost:3000/fixed_income)
- **Retirement Corpus (PPF/EPF):** [http://localhost:3000/retirement](http://localhost:3000/retirement)
- **Insurance Shield:** [http://localhost:3000/insurance](http://localhost:3000/insurance)
- **Banking & Cards:** [http://localhost:3000/banking](http://localhost:3000/banking)

## Running Tests
```bash
bundle exec rspec
```
