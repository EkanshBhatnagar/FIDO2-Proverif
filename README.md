# Experiments on FIDO2 Using ProVerif

---

## Table of Contents

- [Installation](#installation)
- [Running ProVerif Models](#running-proverif-models)
- [Model Descriptions](#model-descriptions)
- [FIDO2WebServer](#fido2webserver)
- [Notes](#notes)

---

## Installation

1. **Install OPAM** (OCaml Package Manager):

    ```bash
    bash -c "sh <(curl -fsSL https://opam.ocaml.org/install.sh)"
    ```

2. **Update OPAM** to avoid version compatibility issues:

    ```bash
    opam update
    ```

3. **Install necessary packages:**

    ```bash
    opam depext conf-graphviz
    opam depext proverif
    opam install proverif
    ```

4. **Add ProVerif to your PATH:**

    ProVerif executables are installed in `~/.opam/<switch>/bin`. Add this directory to your `PATH` environment variable to access ProVerif globally.

    ```bash
    export PATH=~/.opam/<switch>/bin:$PATH
    ```

    Replace `<switch>` with your current OPAM switch, typically something like `default`.

---

## Running ProVerif Models

To analyze a model, run ProVerif on a `.pv` file as follows:

```bash
proverif -graph <results_folder> <model_file.pv>
```

- `<results_folder>`: Output directory for graph files.
- `<model_file.pv>`: The ProVerif model file you wish to analyze.

---

## Model Descriptions

| File Name                          | Description                                             |
|-------------------------------------|---------------------------------------------------------|
| `fido2_secure_auth.pv`              | Basic FIDO2 authentication with secure channels         |
| `fido2_secure_reg.pv`               | Basic FIDO2 registration with secure channels           |
| `fido2_load_balancer_auth.pv`       | FIDO2 authentication with an added load balancer        |
| `fido2_jasson_auth.pv`              | Modified Procotol to fix vulnerabilities                |

> **Note:** Other model files in this repository may be temporary or experimental. This list will be updated to highlight stable and working models.

---

## FIDO2WebServer

The `FIDO2WebServer` folder contains a basic Flask implementation of the FIDO2 protocol. This is intended for testing and demonstration purposes alongside the ProVerif models.

**Features:**
- Sample FIDO2 registration and authentication endpoints
- Reference implementation to facilitate integration with hardware authenticators or browser clients

**Usage:**
1. Navigate into the `FIDO2WebServer` directory:
    ```bash
    cd FIDO2WebServer
    ```
2. Install dependencies (requires Python 3):
    ```bash
    pip install -r requirements.txt
    ```
3. Run the server:
    ```bash
    flask run
    ```

Please see the `FIDO2WebServer/README.md` file for more details.

---

## Notes

- This repository is **under development**. Some parts of the code may lack detailed comments, and certain models might contain debug code.
