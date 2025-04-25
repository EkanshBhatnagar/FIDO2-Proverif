# Experiments on FIDO2 using Proverif

## Installing Proverif
1. Install OPAM using install script
``bash -c "sh <(curl -fsSL https://opam.ocaml.org/install.sh)"``

2. Update OPAM to avoid version compatibility issues.
``opam update``

3. Run and install following packages.
``opam depext conf-graphviz``
``opam depext proverif``
``opam install proverif``

4. Proverif executables are in ``~/.opam/⟨switch⟩/bin``, add to PATH for using proverif executable directly.

## Running Proverif Model files (.pv)
``proverif -graph <lresults_folder> <model_file.pv>``

## Models Description
1. ``fido2_secure_auth.pv`` - Basic FIDO2 Authentication with secure channels.
2. ``fido2_secure_reg.pv`` - Basic FIDO2 Registration with secure channels.
3. ``fido2_load_balancer_auth.pv`` - Basic FIDO2 Authentication with load balancer added.

All other files are temporary will update this list to mark important/working models.

Note: This is underdevelopment, some part of the code doesn't have good comments with them and some models have some not needed debug code. I am in the process of adding them.