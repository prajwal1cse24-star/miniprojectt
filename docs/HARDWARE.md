# Hardware Requirements

This file documents the project's hardware expectations. The canonical machine-readable file is `config/hardware.json`.

Fields in `config/hardware.json`:

- `minRamGB`: Minimum RAM in GB
- `recommendedRamGB`: Recommended RAM in GB
- `minCpuCores`: Minimum CPU cores
- `recommendedCpuCores`: Recommended CPU cores
- `storageGB`: Required storage in GB
- `notes`: Freeform notes

When you change `config/hardware.json`, run `node scripts/check_hardware.mjs` to validate the file.
