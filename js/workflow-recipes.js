(function () {
    "use strict";

    const recipes = {
  "structure.choose": [
    {
      "title": "Compare alternative pockets with fpocket and P2Rank",
      "note": "Use at least two complementary cavity methods when the binding site is uncertain. fpocket is a fast Voronoi-based cavity detector; P2Rank/PrankWeb predicts ligand-binding sites with machine learning and offers a GUI/web route; CAVIAR detects cavities and decomposes them into subpockets, but its upstream GitHub project is currently marked paused. I could not verify a standalone pocket-finding tool named PocketMol. If you meant Pocket2Mol, it is a pocket-conditioned molecular generator—not a cavity detector. Treat every predicted cavity as a hypothesis to inspect against experimental ligands, conservation, biology and literature.",
      "code": "# fpocket: fast cavity finding/characterization\nfpocket -f receptor_clean.pdb\n\n# P2Rank: machine-learning ranking of likely ligand-binding sites.\n# Run after installing P2Rank and ensuring the prank command is on PATH:\nprank predict -f receptor_clean.pdb\n\n# Inspect each tool's ranked pocket output and open the predicted pocket\n# coordinates/visualization alongside the protein in PyMOL or ChimeraX.\n# Compare predicted sites with known ligand sites, conserved residues,\n# catalytic sites, interfaces, conservation, biology and literature.\n# Pocket IDs/scores from different programs are not directly comparable.",
      "links": [
        {
          "title": "P2Rank / PrankWeb",
          "url": "https://github.com/rdk/p2rank"
        },
        {
          "title": "PrankWeb graphical server",
          "url": "https://prankweb.cz/"
        },
        {
          "title": "fpocket",
          "url": "https://github.com/Discngine/fpocket"
        },
        {
          "title": "CAVIAR (project paused)",
          "url": "https://github.com/jr-marchand/caviar"
        },
        {
          "title": "Pocket2Mol (molecule generation, not pocket detection)",
          "url": "https://github.com/pengxingang/pocket2mol"
        }
      ]
    }
  ],
  "ligand.query": [
    {
      "title": "Get known ligands without losing assay provenance",
      "note": "ChEMBL is the first-choice source for target-linked curated bioactivity. DataWarrior can search ChEMBL directly; you do not need to make a CSV first just to view compounds.",
      "code": "# In DataWarrior:\n# 1. Open DataWarrior.\n# 2. Choose Database > Search ChEMBL database.\n# 3. Search by target name or ChEMBL target ID; verify the organism and target type.\n# 4. Select the activity endpoint you need (e.g. IC50 OR Ki OR EC50).\n# 5. Keep molecule ID, SMILES, standard type/relation/value/units,\n#    assay ID/type, target ID, document/source and organism.\n# 6. Save the original result, then make a curated working copy.\n#\n# In ChEMBL's web interface, export the equivalent fields.\n# Do not pool IC50, Ki and EC50 into one potency series without a\n# scientifically justified endpoint-specific plan.",
      "links": [
        {
          "title": "ChEMBL database",
          "url": "https://www.ebi.ac.uk/chembl/"
        },
        {
          "title": "DataWarrior",
          "url": "https://openmolecules.org/datawarrior/"
        },
        {
          "title": "ChEMBL web services documentation",
          "url": "https://chembl.gitbook.io/chembl-interface-documentation/web-services/chembl-data-web-services"
        }
      ]
    }
  ],
  "structure.prepare": [
    {
      "title": "Prepare 10 independent conformers per ligand with RDKit",
      "note": "Input file format: one SMILES and stable compound ID per line, separated by a tab in ligands.smi. This generates up to 10 3D conformers per input structure and writes each to its own SDF. It does not enumerate tautomers, protonation states, stereoisomers or alternate chemical identities; handle those as separately justified states.",
      "code": "from pathlib import Path\nfrom rdkit import Chem\nfrom rdkit.Chem import AllChem\n\nINPUT = Path(\"ligands.smi\")  # SMILES<TAB>compound_id\nOUT = Path(\"conformers\")\nN_CONFORMERS = 10\nSEED = 20261012\nOUT.mkdir(parents=True, exist_ok=True)\n\nn_written = 0\nwith INPUT.open(encoding=\"utf-8\") as handle:\n    for line_number, line in enumerate(handle, start=1):\n        line = line.strip()\n        if not line or line.startswith(\"#\"):\n            continue\n        fields = line.split(\"\\t\", 1)\n        if len(fields) != 2:\n            raise ValueError(f\"Line {line_number}: expected SMILES<TAB>compound_id\")\n\n        smiles, compound_id = fields[0].strip(), fields[1].strip()\n        mol = Chem.MolFromSmiles(smiles)\n        if mol is None:\n            print(f\"SKIP invalid SMILES: {compound_id}\")\n            continue\n\n        mol = Chem.AddHs(mol)\n        params = AllChem.ETKDGv3()\n        params.randomSeed = SEED\n        params.numThreads = 0\n        # Keep up to N conformers; reduceRmsThresh=-1 disables RMS pruning.\n        params.pruneRmsThresh = -1.0\n        conformer_ids = list(AllChem.EmbedMultipleConfs(\n            mol, numConfs=N_CONFORMERS, params=params\n        ))\n        if not conformer_ids:\n            print(f\"SKIP embedding failed: {compound_id}\")\n            continue\n\n        try:\n            optimization = AllChem.MMFFOptimizeMoleculeConfs(\n                mol, numThreads=0, maxIters=500\n            )\n        except Exception as exc:\n            print(f\"SKIP MMFF unavailable for {compound_id}: {exc}\")\n            continue\n\n        for conformer_id, (not_converged, energy) in zip(conformer_ids, optimization):\n            one = Chem.Mol(mol)\n            one.RemoveAllConformers()\n            one.AddConformer(Chem.Conformer(mol.GetConformer(conformer_id)), assignId=True)\n            one.SetProp(\"_Name\", f\"{compound_id}_conf{conformer_id:02d}\")\n            one.SetProp(\"compound_id\", compound_id)\n            one.SetProp(\"conformer_id\", str(conformer_id))\n            one.SetProp(\"MMFF_energy\", f\"{energy:.4f}\")\n            one.SetProp(\"MMFF_converged\", str(not not_converged))\n            safe_id = \"\".join(c if c.isalnum() or c in \"._-\" else \"_\" for c in compound_id)\n            output = OUT / f\"{safe_id}_conf{conformer_id:02d}.sdf\"\n            writer = Chem.SDWriter(str(output))\n            writer.write(one)\n            writer.close()\n            n_written += 1\n\n        if len(conformer_ids) < N_CONFORMERS:\n            print(f\"NOTE {compound_id}: generated {len(conformer_ids)} conformers\")\n\nprint(f\"Wrote {n_written} conformer SDF files to {OUT}/\")",
      "links": [
        {
          "title": "RDKit conformer generation",
          "url": "https://www.rdkit.org/docs/GettingStartedInPython.html"
        },
        {
          "title": "Meeko ligand preparation",
          "url": "https://meeko.readthedocs.io/en/develop/lig_prep_basic.html"
        }
      ]
    },
    {
      "title": "Prepare receptor and convert each ligand conformer to PDBQT",
      "note": "Inspect the structure before this step: select the correct chain/assembly, retain biologically important cofactors or metals, decide deliberately about conserved waters, and resolve alternate locations/missing pocket atoms. The example defines the search box around an aligned co-crystal ligand with 5 Å padding; review the generated box visually.",
      "code": "# Receptor: receptor_clean.pdb and native_ligand.pdb must be aligned\n# in the same crystallographic coordinate frame.\nmk_prepare_receptor.py --read_pdb receptor_clean.pdb \\\n  -o receptor_prepared -p -j -v \\\n  --box_enveloping native_ligand.pdb --padding 5\n\n# Prepare each independently generated ligand conformer.\nmkdir -p ligand_pdbqt\nfor sdf in conformers/*.sdf; do\n  name=\"$(basename \"${sdf%.sdf}\")\"\n  mk_prepare_ligand.py -i \"$sdf\" -o \"ligand_pdbqt/${name}.pdbqt\"\ndone\n\n# Inspect receptor_prepared.pdbqt and the box files before docking.\n# Do not mix protonation, charge or atom-typing policies across engines.",
      "links": [
        {
          "title": "Meeko receptor preparation",
          "url": "https://meeko.readthedocs.io/en/develop/cli_rec_prep.html"
        },
        {
          "title": "Meeko ligand preparation",
          "url": "https://meeko.readthedocs.io/en/develop/lig_prep_basic.html"
        }
      ]
    }
  ],
  "structure.redock": [
    {
      "title": "Redock independently prepared ligand conformers and inspect pose RMSD",
      "note": "Redocking means removing the crystallographic ligand from the receptor and docking a separately prepared structure back into the same site. Use one consistent receptor preparation and a search box based on the crystal site. The first pose in a multi-pose file is not guaranteed to be the one you intend to evaluate: inspect score records and select the intended pose before RMSD calculation.",
      "code": "# GNINA accepts a PDB receptor and SDF ligand input.\ngnina -r receptor_clean.pdb \\\n  -l conformers/KNOWN_ACTIVE_conf00.sdf \\\n  --center_x X --center_y Y --center_z Z \\\n  --size_x 22 --size_y 22 --size_z 22 \\\n  --exhaustiveness 32 --seed 20261012 \\\n  -o results/gnina_redock.sdf\n\n# Select/export the intended single redocked pose as redocked_pose.sdf.\n# Ensure native_ligand.sdf and redocked_pose.sdf represent the same\n# chemical structure, stereochemistry and atom mapping.\nobrms native_ligand.sdf redocked_pose.sdf\n\n# Compare the aligned pose and key contacts visually as well.\n# Do NOT use obrms -m as the primary pocket pose-recovery metric:\n# the optional rigid-body minimization can conceal positional displacement.\n# Symmetry-equivalent atoms and atom mapping can affect reported RMSD.",
      "links": [
        {
          "title": "GNINA official usage",
          "url": "https://github.com/gnina/gnina"
        },
        {
          "title": "Open Babel obrms manual",
          "url": "https://manpages.debian.org/testing/openbabel/obrms.1.en.html"
        }
      ]
    }
  ],
  "structure.crossdock": [
    {
      "title": "Cross-dock with an ensemble of receptors and scoring engines",
      "note": "Use GNINA, SMINA and AutoDock Vina as accessible comparators. SMINA and Vina share much of the Vina lineage, so they are not fully independent methods; GNINA adds CNN-based scoring, but still includes Vina-derived search/scoring options. If you need a more distinct docking engine and can support the setup, evaluate DOCK 6 as an additional comparator. Use the same prepared ligand identities, compatible receptor states, documented box definition, seeds and comparable sampling effort. Never average raw energies/CNN scores as though they had the same units.",
      "code": "# Example GNINA run; replace box centre (X,Y,Z) and receptor/ligand files.\ngnina -r receptor_state_A.pdb -l ligand.sdf \\\n  --center_x X --center_y Y --center_z Z \\\n  --size_x 22 --size_y 22 --size_z 22 \\\n  --exhaustiveness 32 --seed 20261012 \\\n  -o results/gnina_stateA.sdf\n\n# Example SMINA run. Receptor/ligand must be compatible PDBQT files.\nsmina -r receptor_state_A.pdbqt -l ligand.pdbqt \\\n  --center_x X --center_y Y --center_z Z \\\n  --size_x 22 --size_y 22 --size_z 22 \\\n  --exhaustiveness 16 --seed 20261012 \\\n  --out results/smina_stateA.pdbqt\n\n# Example AutoDock Vina run (third accessible comparator).\nvina --receptor receptor_state_A.pdbqt --ligand ligand.pdbqt \\\n  --center_x X --center_y Y --center_z Z \\\n  --size_x 22 --size_y 22 --size_z 22 \\\n  --exhaustiveness 16 --seed 20261012 \\\n  --out results/vina_stateA.pdbqt\n\n# Repeat for each relevant receptor state and the predefined ligand set.\n# Define cross-docking as ligand i in receptor j (i != j when structures\n# are paired with different ligands); do not label repeated self-redocking\n# as cross-docking. Keep engine, receptor, ligand, seed and score fields.",
      "links": [
        {
          "title": "GNINA",
          "url": "https://github.com/gnina/gnina"
        },
        {
          "title": "SMINA",
          "url": "https://github.com/mwojcikowski/smina"
        },
        {
          "title": "AutoDock Vina documentation",
          "url": "https://autodock-vina.readthedocs.io/"
        },
        {
          "title": "DOCK 6",
          "url": "https://github.com/docking-org/dock6"
        }
      ]
    },
    {
      "title": "Run a self-/cross-docking matrix across receptors and 10 conformers",
      "note": "Prepare an SDF/PDBQT conformer set once, then run each ligand conformer against every receptor state. This Cartesian-product run includes both self-docking pairs and cross-docking pairs; keep a manifest mapping each native ligand to its source receptor so results can be labelled correctly. Define and record a separate validated box for each receptor. This is a starter script, not a claim that all receptors/states are biologically interchangeable.",
      "code": "#!/usr/bin/env bash\nset -euo pipefail\n\n# Expected:\n#   receptors/stateA.pdb and receptors/stateA.pdbqt\n#   receptors/stateB.pdb and receptors/stateB.pdbqt\n#   ligand_pdbqt/compound_conf00.pdbqt ... compound_conf09.pdbqt\n#   boxes.tsv: receptor<TAB>cx<TAB>cy<TAB>cz<TAB>sx<TAB>sy<TAB>sz\n# Put one validated box row per receptor in boxes.tsv.\nmkdir -p ensemble_results/{gnina,smina,vina}\n\nwhile IFS=$'\\t' read -r state cx cy cz sx sy sz; do\n  [[ -z \"${state:-}\" || \"$state\" == \"#receptor\" ]] && continue\n  for ligand in ligand_pdbqt/*.pdbqt; do\n    [[ -e \"$ligand\" ]] || { echo \"No ligands found\" >&2; exit 1; }\n    name=\"$(basename \"${ligand%.pdbqt}\")\"\n    tag=\"${name}__in__${state}\"\n\n    # GNINA uses the receptor PDB here; box settings are state-specific.\n    gnina -r \"receptors/${state}.pdb\" -l \"$ligand\" \\\n      --center_x \"$cx\" --center_y \"$cy\" --center_z \"$cz\" \\\n      --size_x \"$sx\" --size_y \"$sy\" --size_z \"$sz\" \\\n      --exhaustiveness 16 --seed 20261012 --pose_sort_order CNNscore \\\n      -o \"ensemble_results/gnina/${tag}.sdf\" \\\n      --log \"ensemble_results/gnina/${tag}.log\"\n\n    smina -r \"receptors/${state}.pdbqt\" -l \"$ligand\" \\\n      --center_x \"$cx\" --center_y \"$cy\" --center_z \"$cz\" \\\n      --size_x \"$sx\" --size_y \"$sy\" --size_z \"$sz\" \\\n      --exhaustiveness 16 --seed 20261012 \\\n      --out \"ensemble_results/smina/${tag}.pdbqt\"\n\n    vina --receptor \"receptors/${state}.pdbqt\" --ligand \"$ligand\" \\\n      --center_x \"$cx\" --center_y \"$cy\" --center_z \"$cz\" \\\n      --size_x \"$sx\" --size_y \"$sy\" --size_z \"$sz\" \\\n      --exhaustiveness 16 --seed 20261012 \\\n      --out \"ensemble_results/vina/${tag}.pdbqt\"\n  done\ndone < boxes.tsv\n\n# Build a results table linking ligand ID, source/native receptor, docking\n# receptor state, engine, engine-specific score field, seed and pose filepath.\n# self-docking: source/native receptor == docking receptor state\n# cross-docking: source/native receptor != docking receptor state\n# Compare native-pose RMSD only for chemically identical ligands and the\n# matching crystallographic reference. Rank scores separately by engine.",
      "links": [
        {
          "title": "GNINA",
          "url": "https://github.com/gnina/gnina"
        },
        {
          "title": "SMINA",
          "url": "https://github.com/mwojcikowski/smina"
        },
        {
          "title": "AutoDock Vina",
          "url": "https://autodock-vina.readthedocs.io/"
        },
        {
          "title": "DOCK 6 (different scoring/search lineage)",
          "url": "https://github.com/docking-org/dock6"
        }
      ]
    }
  ],
  "screen.validate": [
    {
      "title": "Test enrichment with known actives and property-matched decoys",
      "note": "A decoy is a benchmark control, not an experimentally confirmed inactive. Prefer experimentally measured inactives from the same target/assay when credible and available; otherwise label generated decoys as decoys and document the generation method. DUD-E and DEKOIS 2.0 are established benchmark sets, while DeepCoy is a decoy-generation approach. Audit property distributions and analogue/similarity bias. Use the exact same preparation and scoring protocol for actives and controls.",
      "code": "# rank_metrics.py\n# Input docking_scores.csv columns:\n# compound_id,label,engine,score\n# label: 1=known active; 0=decoy or credible inactive control\n# score: one scalar per compound/engine (e.g. top-pose score)\n#\n# Set score direction correctly for EACH output column:\n# GNINA CNNscore is generally higher-is-better; affinity/energy is lower-is-better.\nimport math\nimport pandas as pd\nfrom sklearn.metrics import roc_auc_score\n\ndf = pd.read_csv(\"docking_scores.csv\")\nrequired = {\"compound_id\", \"label\", \"engine\", \"score\"}\nmissing = required - set(df.columns)\nif missing:\n    raise ValueError(f\"Missing columns: {sorted(missing)}\")\n\n# Edit names to match the engine and score field in your CSV.\ndirection = {\n    \"gnina_cnnscore\": \"higher\",\n    \"gnina_cnnaffinity\": \"higher\",\n    \"gnina_minimizedaffinity\": \"lower\",\n    \"smina_affinity\": \"lower\",\n    \"vina_affinity\": \"lower\",\n}\nrows = []\nfor engine, group in df.groupby(\"engine\"):\n    if engine not in direction:\n        raise ValueError(f\"Set score direction for engine={engine!r}\")\n    group = group.dropna(subset=[\"label\", \"score\"]).copy()\n    group[\"label\"] = group[\"label\"].astype(int)\n    if group[\"label\"].nunique() != 2:\n        print(f\"SKIP {engine}: need actives and controls\")\n        continue\n    # Higher ranking_score must always mean more likely active.\n    group[\"ranking_score\"] = group[\"score\"] if direction[engine] == \"higher\" else -group[\"score\"]\n    auc = roc_auc_score(group[\"label\"], group[\"ranking_score\"])\n    ranked = group.sort_values(\"ranking_score\", ascending=False)\n    n_top = max(1, math.ceil(0.01 * len(ranked)))\n    top = ranked.head(n_top)\n    overall_active_fraction = group[\"label\"].mean()\n    ef1 = (top[\"label\"].mean() / overall_active_fraction) if overall_active_fraction else float(\"nan\")\n    rows.append({\n        \"engine\": engine, \"n_compounds\": len(group),\n        \"n_actives\": int(group[\"label\"].sum()), \"ROC_AUC\": auc,\n        \"top_1_percent_n\": n_top, \"EF1_percent\": ef1,\n    })\n\nsummary = pd.DataFrame(rows).sort_values(\"ROC_AUC\", ascending=False)\nsummary.to_csv(\"enrichment_summary.csv\", index=False)\nprint(summary.to_string(index=False))\n\n# Report per-engine metrics separately. Add bootstrap confidence intervals\n# and repeat the analysis on a second target/benchmark if possible.",
      "links": [
        {
          "title": "DUD-E benchmark",
          "url": "http://dude.docking.org/"
        },
        {
          "title": "DEKOIS 2.0",
          "url": "https://www.dekois.com/"
        },
        {
          "title": "DeepCoy decoy generation",
          "url": "https://github.com/jaechanglim/DeepCoy"
        },
        {
          "title": "ODDT screening metrics",
          "url": "https://oddt.readthedocs.io/"
        }
      ]
    },
    {
      "title": "Build a rank heatmap without comparing incompatible raw scores",
      "note": "A rank/percentile heatmap helps compare engines on the same compound set without falsely implying that their energy or CNN score scales are equivalent. Lower percentile here means a better rank within that engine. Use explicit column names: CNNscore and predicted CNNaffinity are higher-is-better, whereas minimizedAffinity/Vina-like energy is lower-is-better. Check every exported score column before interpreting the plot.",
      "code": "import pandas as pd\nimport matplotlib.pyplot as plt\n\ndf = pd.read_csv(\"docking_scores.csv\")  # compound_id, engine, score\ndirection = {\n    \"gnina_cnnscore\": \"higher\",\n    \"gnina_cnnaffinity\": \"higher\",\n    \"gnina_minimizedaffinity\": \"lower\",\n    \"smina_affinity\": \"lower\",\n    \"vina_affinity\": \"lower\",\n}\ndf[\"rank_percentile\"] = float(\"nan\")\nfor engine, group in df.groupby(\"engine\"):\n    if engine not in direction:\n        raise ValueError(f\"Set score direction for engine={engine!r}\")\n    ascending = direction[engine] == \"lower\"\n    df.loc[group.index, \"rank_percentile\"] = group[\"score\"].rank(\n        method=\"average\", ascending=ascending, pct=True\n    )\n\n# Restrict the figure to the 50 compounds with best mean rank.\nmean_rank = df.groupby(\"compound_id\")[\"rank_percentile\"].mean()\nselected = mean_rank.nsmallest(50).index\nmatrix = df[df[\"compound_id\"].isin(selected)].pivot(\n    index=\"compound_id\", columns=\"engine\", values=\"rank_percentile\"\n).reindex(selected)\n\nfig, ax = plt.subplots(figsize=(max(7, 1.5 * matrix.shape[1]), 10))\nim = ax.imshow(matrix.to_numpy(), aspect=\"auto\", interpolation=\"nearest\", vmin=0, vmax=1)\nax.set_xticks(range(len(matrix.columns)), matrix.columns, rotation=35, ha=\"right\")\nax.set_yticks(range(len(matrix.index)), matrix.index)\nax.set_title(\"Within-engine rank percentiles (lower is better)\")\nfig.colorbar(im, ax=ax, label=\"Rank percentile\")\nfig.tight_layout()\nfig.savefig(\"engine_rank_heatmap.png\", dpi=220)\nplt.close(fig)",
      "links": [
        {
          "title": "pandas pivot tables",
          "url": "https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.pivot.html"
        },
        {
          "title": "Matplotlib imshow",
          "url": "https://matplotlib.org/stable/api/_as_gen/matplotlib.pyplot.imshow.html"
        }
      ]
    },
    {
      "type": "guide",
      "title": "Choose an appropriate inactive/control set",
      "note": "Best evidence comes from compounds tested inactive in a comparable assay against the same target construct, with the endpoint and relation retained. Generated decoys are useful benchmark controls but are not experimentally confirmed inactive molecules.",
      "steps": [
        "First search the same target/assay context for reported measurements that support an inactive/control label. Keep IC50, Ki, EC50 and assay types separate, preserve censored values, and check source quality. Do not label an untested compound inactive.",
        "When experimental inactives are sparse, use a published benchmark such as DUD-E or DEKOIS 2.0, or generate a decoy set with a method such as DeepCoy. Record the source/version, method and all generation settings.",
        "Check whether actives and controls are balanced in MW/heavy atom count, lipophilicity, HBD/HBA, charge, rotatable bonds and other relevant descriptors. Also inspect close structural similarity to actives, not only descriptor matching.",
        "Run docking/preparation identically for actives and controls. Use more than one sensible decoy set when possible; one decoy set can favour or penalize a method by construction.",
        "Measure ROC-AUC and early enrichment (e.g. EF1% and the number of actives in the top 1%); report set sizes, score direction, confidence intervals or bootstrap uncertainty, and representative false positives/negatives."
      ],
      "links": [
        {
          "title": "DUD-E benchmark",
          "url": "http://dude.docking.org/"
        },
        {
          "title": "DEKOIS 2.0",
          "url": "https://www.dekois.com/"
        },
        {
          "title": "DeepCoy decoy generation",
          "url": "https://github.com/jaechanglim/DeepCoy"
        },
        {
          "title": "ODDT screening evaluation",
          "url": "https://oddt.readthedocs.io/"
        }
      ]
    }
  ],
  "interactions.report": [
    {
      "title": "Run ProLIF across a prepared SDF of docking poses",
      "note": "Start with the crystallographic protein–ligand complex and check the output manually. Then process one validated top pose per compound for a larger known-active plus control/decoy set. Prepare a protein structure with explicit hydrogens and chemically correct residue/bond information. Use SDF output where possible; do not use Open Babel to convert PDBQT back to SDF because bond orders/charges can be lost.",
      "code": "# pip install prolif MDAnalysis rdkit\nimport MDAnalysis as mda\nimport prolif as plf\n\n# Use a prepared protein with explicit hydrogens and verified bond information.\nuniverse = mda.Universe(\"receptor_with_hydrogens.pdb\")\nprotein_atoms = universe.select_atoms(\"protein\")\nprotein = plf.Molecule.from_mda(protein_atoms)\n\n# SDF should contain one chosen pose per compound, with a stable title/ID.\nposes = plf.sdf_supplier(\"top_pose_per_compound.sdf\")\nfingerprint = plf.Fingerprint()  # H-bonds, hydrophobic, pi, charged, VdW, etc.\nfingerprint.run_from_iterable(poses, protein)\n\n# Preserve the generated interaction table and the pose/compound manifest.\ndf = fingerprint.to_dataframe(index_col=\"Pose\")\ndf.to_csv(\"prolif_interaction_fingerprints.csv\")\n\n# Treat interactions as features, not direct proof of activity.\n# Join each pose/row to its active/decoy label using the saved manifest,\n# then compare interaction frequencies by class and by residue.",
      "links": [
        {
          "title": "ProLIF docking tutorial",
          "url": "https://prolif.readthedocs.io/en/stable/notebooks/docking.html"
        },
        {
          "title": "PLIP web server",
          "url": "https://plip-tool.biotec.tu-dresden.de/plip-web/plip/index"
        }
      ]
    },
    {
      "title": "Summarize active-versus-decoy interaction frequencies",
      "note": "First export the fingerprint matrix and create a long-form CSV with one row per compound–interaction pair (compound_id,label,interaction,present; label=active/control). The snippet compares prevalence, not affinity, and assumes each compound contributes one selected pose under the same analysis settings.",
      "code": "import pandas as pd\nimport matplotlib.pyplot as plt\n\n# Required long-form columns: compound_id,label,interaction,present\n# label should be \"active\" or \"control\"; untested is not inactive.\ndf = pd.read_csv(\"plif_long.csv\")\nrequired = {\"compound_id\", \"label\", \"interaction\", \"present\"}\nif not required.issubset(df.columns):\n    raise ValueError(f\"Expected columns: {sorted(required)}\")\ndf[\"present\"] = df[\"present\"].astype(bool)\n\nfrequency = df.groupby([\"label\", \"interaction\"])[\"present\"].mean().unstack(\"label\")\nfrequency[\"difference_active_minus_control\"] = (\n    frequency.get(\"active\", 0) - frequency.get(\"control\", 0)\n)\nfrequency = frequency.sort_values(\"difference_active_minus_control\")\nfrequency.to_csv(\"plif_class_frequency.csv\")\n\nplot = frequency[\"difference_active_minus_control\"].tail(30)\nfig, ax = plt.subplots(figsize=(9, max(5, 0.28 * len(plot))))\nax.barh(plot.index.astype(str), plot.values)\nax.axvline(0, linewidth=1)\nax.set_xlabel(\"Active frequency minus control frequency\")\nax.set_title(\"Interaction-fingerprint prevalence by class\")\nfig.tight_layout()\nfig.savefig(\"plif_active_control_difference.png\", dpi=220)\nplt.close(fig)\n\n# Follow up with residue/chemotype-stratified analysis, uncertainty intervals,\n# and pose-quality review; apparent associations may reflect docking bias.",
      "links": [
        {
          "title": "ProLIF interaction fingerprints",
          "url": "https://prolif.readthedocs.io/en/latest/source/modules/interaction-fingerprint.html"
        },
        {
          "title": "PLIP",
          "url": "https://github.com/pharmai/plip"
        }
      ]
    }
  ],
  "model.baseline": [
    {
      "title": "Train a transparent baseline QSAR with a scaffold holdout",
      "note": "This is an illustrative regression baseline, not a turnkey production QSAR. Prepare curated_activity.csv with one standardized endpoint only and columns smiles,pIC50. Deduplicate and resolve conflicting observations before running; censored measurements need a predeclared policy rather than being copied into the numeric target. A random scaffold split may be unstable when few unique scaffolds exist.",
      "code": "# pip install rdkit scikit-learn pandas numpy\nfrom pathlib import Path\nimport numpy as np\nimport pandas as pd\nfrom rdkit import Chem, DataStructs\nfrom rdkit.Chem import AllChem\nfrom rdkit.Chem.Scaffolds import MurckoScaffold\nfrom sklearn.model_selection import GroupShuffleSplit\nfrom sklearn.ensemble import RandomForestRegressor\nfrom sklearn.metrics import mean_absolute_error, r2_score\n\ndata = pd.read_csv(\"curated_activity.csv\").dropna(subset=[\"smiles\", \"pIC50\"])\nfps, values, groups, kept_smiles = [], [], [], []\nfor row in data.itertuples(index=False):\n    mol = Chem.MolFromSmiles(str(row.smiles))\n    if mol is None:\n        continue\n    fp = AllChem.GetMorganFingerprintAsBitVect(mol, radius=2, nBits=2048)\n    arr = np.zeros((2048,), dtype=np.int8)\n    DataStructs.ConvertToNumpyArray(fp, arr)\n    scaffold = MurckoScaffold.MurckoScaffoldSmiles(mol=mol)\n    # For acyclic compounds, use canonical SMILES so all acyclic molecules\n    # do not fall into one empty-scaffold group.\n    group = scaffold or Chem.MolToSmiles(mol, isomericSmiles=True)\n    fps.append(arr)\n    values.append(float(row.pIC50))\n    groups.append(group)\n    kept_smiles.append(row.smiles)\n\nX = np.asarray(fps)\ny = np.asarray(values, dtype=float)\ng = np.asarray(groups)\nif len(set(g)) < 5:\n    raise ValueError(\"Too few distinct scaffolds for a meaningful scaffold holdout\")\n\nsplitter = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=42)\ntrain_idx, test_idx = next(splitter.split(X, y, groups=g))\nmodel = RandomForestRegressor(\n    n_estimators=500, random_state=42, n_jobs=-1, min_samples_leaf=2\n)\nmodel.fit(X[train_idx], y[train_idx])\npred = model.predict(X[test_idx])\nprint(f\"train={len(train_idx)} test={len(test_idx)}\")\nprint(f\"MAE (pIC50 units): {mean_absolute_error(y[test_idx], pred):.3f}\")\nprint(f\"R2: {r2_score(y[test_idx], pred):.3f}\")\n\npd.DataFrame({\n    \"smiles\": np.asarray(kept_smiles)[test_idx],\n    \"observed_pIC50\": y[test_idx],\n    \"predicted_pIC50\": pred,\n    \"scaffold\": g[test_idx],\n}).to_csv(\"qsar_scaffold_holdout_predictions.csv\", index=False)\n\n# Before using this for decisions: evaluate uncertainty/applicability,\n# compare simpler baselines, check class/endpoint noise, try repeated scaffold\n# splits, and keep an untouched external/prospective test set if possible.",
      "links": [
        {
          "title": "RDKit",
          "url": "https://www.rdkit.org/docs/"
        },
        {
          "title": "DeepChem",
          "url": "https://deepchem.io/"
        },
        {
          "title": "KNIME Analytics Platform",
          "url": "https://www.knime.com/knime-analytics-platform"
        }
      ]
    }
  ],
  "design.enumerate": [
    {
      "title": "Choose a design strategy: grow a fragment, decorate a scaffold, or generate de novo",
      "note": "Use structure-conditioned generation only after the pocket and experimental reference pose are qualified. For a known core, begin with constrained decoration/matched analogues; for fragments, preserve the anchor geometry and explicitly score growth vectors; for de novo design, constrain chemistry and synthesis before ranking. A generated structure is a design hypothesis, not a predicted binder.",
      "code": "# Suggested starting points (choose one route; do not combine outputs blindly)\n#\n# Scaffold decoration / R-group exploration:\n#   REINVENT4 LibInvent generator\n#\n# Fragment linking:\n#   REINVENT4 LinkInvent generator\n#\n# Whole-molecule optimization:\n#   REINVENT4 Mol2Mol generator\n#\n# Pocket-conditioned 3D generation (more demanding setup):\n#   Pocket2Mol or PocketXMol\n#\n# For every route, freeze the reference scaffold/pharmacophore, allowed\n# substitution vectors, charge/stereochemistry policy, property constraints,\n# building-block/reaction limits, novelty policy and experimental budget.\n# Sanitize and deduplicate all outputs, then independently check pocket fit,\n# strain, properties, synthetic feasibility, and model applicability.\n# Keep nearest known active/decoy neighbours and provenance for each proposal.",
      "links": [
        {
          "title": "REINVENT4 documentation",
          "url": "https://github.com/MolecularAI/REINVENT4"
        },
        {
          "title": "Pocket2Mol",
          "url": "https://github.com/pengxingang/pocket2mol"
        },
        {
          "title": "PocketXMol",
          "url": "https://github.com/pengxingang/PocketXMol"
        },
        {
          "title": "Pharmit",
          "url": "https://pharmit.csb.pitt.edu/"
        }
      ]
    },
    {
      "type": "guide",
      "title": "Fragment growing, fragment linking, scaffold decoration and de novo design",
      "note": "Choose the design operation that matches your evidence. Do not treat the methods as interchangeable: a growing operation expands from one anchored fragment; a linker-generation method connects two fragments; scaffold decoration changes substituents around a retained core; de novo design may replace most or all of the starting scaffold.",
      "steps": [
        "Fragment growing: keep the experimentally supported fragment anchor and its coordinates/pharmacophore features fixed. Choose one solvent-exposed growth vector at a time; enumerate chemically plausible substituents/fragment extensions using RDKit or a constrained generator. Re-dock/inspect the grown poses, strain and clashes, and compare to a matched un-grown fragment control.",
        "Fragment linking: use REINVENT4 LinkInvent (or another linker generator) when two positioned fragments/warheads should be connected. Preserve both anchors and exit vectors; score linker geometry, strain, flexibility, properties and synthetic feasibility.",
        "Scaffold decoration: use REINVENT4 LibInvent or RDKit-based R-group enumeration when you want to preserve a core/pharmacophore and vary selected positions. Keep matched pairs so each substitution tests a defined hypothesis.",
        "De novo / pocket-conditioned generation: use REINVENT4 Mol2Mol or a pocket-conditioned method such as Pocket2Mol/PocketXMol when new molecular graphs or scaffold changes are justified. Fix hard constraints and rejection rules before sampling.",
        "For all approaches: retain generator/version, seed/settings, starting ligand/fragments, anchor atom mapping, all generated/rejected structures and rejection reasons. Sanitize, standardize and deduplicate outputs; independently check binding hypotheses, ADMET and synthesis.",
        "Compare at least one baseline: a simple enumerated analogue set or known-ligand nearest neighbours. Promote molecules only when they provide a testable, discriminating experiment and a plausible make/buy route."
      ],
      "links": [
        {
          "title": "REINVENT4",
          "url": "https://github.com/MolecularAI/REINVENT4"
        },
        {
          "title": "Pocket2Mol",
          "url": "https://github.com/pengxingang/pocket2mol"
        },
        {
          "title": "PocketXMol",
          "url": "https://github.com/pengxingang/PocketXMol"
        },
        {
          "title": "RDKit documentation",
          "url": "https://www.rdkit.org/docs/"
        }
      ]
    }
  ],
  "develop.profile": [
    {
      "title": "Run complementary ADMET prediction, then choose experiments",
      "note": "Compare compounds with identical structures/standardization and preserve each model's endpoint definitions. Predictions from different servers are not directly interchangeable; report experimental data separately and investigate disagreements instead of averaging them.",
      "code": "# Batch route:\n# 1. Save a standardized SDF or SMILES table with a stable compound ID.\n# 2. Submit the same compound set separately to:\n#      ADMET-AI (web/prediction tools or the package workflow),\n#      ADMETlab 3.0,\n#      Deep-PK (73 endpoint PK/toxicity prediction platform).\n# 3. Download each tool's output separately and preserve the tool/version,\n#    date, endpoint, units, uncertainty/applicability flags and compound IDs.\n# 4. Merge only by a verified stable compound ID / canonical structure.\n# 5. Add experimental solubility, permeability, microsomal stability and\n#    safety data as separate columns when available.\n#\n# CNS programs should add brain exposure / BBB evidence explicitly; generic\n# drug-likeness scores do not establish CNS penetration.",
      "links": [
        {
          "title": "ADMET-AI",
          "url": "https://admet.ai.greenstonebio.com/"
        },
        {
          "title": "ADMETlab 3.0",
          "url": "https://admetlab3.scbdd.com/"
        },
        {
          "title": "Deep-PK",
          "url": "https://biosig.lab.uq.edu.au/deeppk/"
        }
      ]
    }
  ],
  "synthesis.route": [
    {
      "title": "Triage retrosynthesis and synthetic practicality",
      "note": "Retrosynthesis predictions prioritize route hypotheses; they do not prove route feasibility, yield, selectivity or starting-material availability. Check each key transformation against literature and local chemistry, and ask whether the route can deliver a matched analogue series and controls.",
      "code": "# A practical sequence for each nominated compound:\n# 1. Validate the structure, stereochemistry, salt form and intended scale.\n# 2. Run a retrosynthesis planner (AiZynthFinder or ASKCOS).\n# 3. Compare alternative disconnections and verify commercial availability\n#    of starting materials from the selected supplier/catalogue.\n# 4. Inspect precedent, substrate scope, functional-group compatibility,\n#    regio-/stereoselectivity, protecting groups, hazards and purification.\n# 5. Identify the first uncertain/high-risk step and an alternative route.\n# 6. Record route confidence, main assumptions and experimental review needs.\n#\n# For analogue series, compare route convergence and whether the route supports\n# parallel synthesis and generation of matched controls.",
      "links": [
        {
          "title": "AiZynthFinder",
          "url": "https://github.com/MolecularAI/aizynthfinder"
        },
        {
          "title": "ASKCOS",
          "url": "https://askcos.mit.edu/"
        },
        {
          "title": "ChemIsFree tool catalogue",
          "url": "https://github.com/ChemIsFree/tools"
        }
      ]
    }
  ],
  "ligand.series": [
    {
      "type": "guide",
      "title": "Build and validate a pharmacophore hypothesis",
      "note": "Pharmacophores should encode a stated structural/SAR hypothesis. Do not create features from a single docked pose and immediately call the resulting screen validated. Use independent known actives, property-matched decoys or suitable controls, and keep a holdout set for evaluation.",
      "steps": [
        "For ligand-based mapping, curate a set of potent, assay-compatible actives, generate plausible conformers, align the series and identify recurring donor/acceptor, hydrophobic, aromatic and charged features. Inspect outliers and alternative binding modes.",
        "For structure-based mapping, begin with a well-supported crystallographic complex and correctly identified ligand. Use the receptor to distinguish ligand features that participate in the binding interaction from features irrelevant to the pocket; consider conserved waters only with explicit justification.",
        "For a GUI-first route, use Pharmit to construct a query from a PDB/ligand or feature file and screen available conformer libraries. Its receptor-derived feature elucidation is labelled experimental, so don't rely on it as the only method.",
        "For a local GUI workflow, OpenPharmaco provides protein-based pharmacophore modeling and library screening; for Python workflows, OpenPharmacophore provides a library for ligand-, ligand–receptor- and receptor-based models.",
        "Freeze feature definitions/radii before evaluating a holdout active/control set. Report active recovery, enrichment, library size and false-positive patterns, then inspect which features drive the ranking.",
        "Record the hypothesis version, reference ligands, conformer/protonation policy, feature settings, training/holdout membership and software version."
      ],
      "links": [
        {
          "title": "Pharmit (browser-based pharmacophore screening)",
          "url": "https://pharmit.csb.pitt.edu/"
        },
        {
          "title": "Pharmit help and PDB/ligand workflow",
          "url": "https://pharmit.csb.pitt.edu/help.html"
        },
        {
          "title": "OpenPharmaco (GUI protein-based pharmacophore)",
          "url": "https://github.com/SeonghwanSeo/OpenPharmaco"
        },
        {
          "title": "OpenPharmacophore (Python library)",
          "url": "https://github.com/uibcdf/OpenPharmacophore"
        }
      ]
    }
  ],
  "interactions.native": [
    {
      "type": "guide",
      "title": "Analyze the crystallographic ligand with PLIP / ProLIF",
      "note": "Use the ligand that is actually resolved in the experimental structure, not a docking pose. First verify the ligand component ID, residue number and chain; many crystals contain additives, buffer components, ions or cofactors. Preserve the prepared complex and record any choices about hydrogens, waters and metals.",
      "steps": [
        "Open the matching PDB entry in RCSB and note the exact protein chain, ligand component/residue ID and construct. Download the original coordinate file and retain an unchanged copy.",
        "For the simplest graphical route, upload the complex to the PLIP web server, select the correct ligand if prompted, and inspect the residue-level interaction report and visualisation. Save the report and record the input structure/chain/ligand.",
        "For a locally reproducible route, prepare a protein with reliable atom/bond information and explicit hydrogens, and extract the crystallographic ligand as an SDF with stereochemistry and atom identities checked. Run ProLIF on this experimental pose and export the interaction fingerprint.",
        "Manually inspect key contacts in PyMOL or ChimeraX. Record hydrogen bonds, hydrophobic contacts, aromatic/charged interactions, metals and relevant waters; label them as observed geometry, not a measured energetic contribution.",
        "Keep this native-complex fingerprint as the reference. Later, run PLIP/ProLIF across one consistently selected pose per known active and control/decoy, then compare interaction prevalence by class and residue."
      ],
      "links": [
        {
          "title": "PLIP web server",
          "url": "https://plip-tool.biotec.tu-dresden.de/plip-web/plip/index"
        },
        {
          "title": "PLIP source and CLI",
          "url": "https://github.com/pharmai/plip"
        },
        {
          "title": "ProLIF docking tutorial",
          "url": "https://prolif.readthedocs.io/en/stable/notebooks/docking.html"
        },
        {
          "title": "RCSB PDB",
          "url": "https://www.rcsb.org/"
        }
      ]
    }
  ],
  "screen.library": [
    {
      "title": "Run a small, reproducible GNINA virtual-screening pilot",
      "note": "Use this only after the receptor, box, native-pose recovery and active/control enrichment have passed. Start with a small subset, confirm the output score fields, then scale. The loop docks every prepared ligand conformer; aggregate conformers to compound IDs before ranking the compound library. For larger campaigns or high-performance computing, tools such as VirtualFlow can manage distributed screening.",
      "code": "#!/usr/bin/env bash\nset -euo pipefail\n\nRECEPTOR=\"receptor_clean.pdb\"\nCENTER_X=12.0   # replace with your validated box centre\nCENTER_Y=18.0\nCENTER_Z=24.0\nSIZE_X=22.0     # replace with your validated box dimensions\nSIZE_Y=22.0\nSIZE_Z=22.0\nOUT=\"gnina_screen\"\nmkdir -p \"$OUT\"\n\nfor ligand in ligand_pdbqt/*.pdbqt; do\n  [[ -e \"$ligand\" ]] || { echo \"No ligand PDBQT files found\" >&2; exit 1; }\n  name=\"$(basename \"${ligand%.pdbqt}\")\"\n  echo \"Docking $name\"\n  gnina -r \"$RECEPTOR\" -l \"$ligand\" \\\n    --center_x \"$CENTER_X\" --center_y \"$CENTER_Y\" --center_z \"$CENTER_Z\" \\\n    --size_x \"$SIZE_X\" --size_y \"$SIZE_Y\" --size_z \"$SIZE_Z\" \\\n    --exhaustiveness 16 --seed 20261012 --pose_sort_order CNNscore \\\n    --cpu 1 --log \"$OUT/${name}.log\" \\\n    -o \"$OUT/${name}.sdf\"\ndone\n\n# Inspect the first output SDF and logs before scaling up.\n# Preserve compound IDs; a file per conformer is not yet a compound-level ranking.",
      "links": [
        {
          "title": "GNINA official README",
          "url": "https://github.com/gnina/gnina"
        },
        {
          "title": "VirtualFlow (large-scale screening)",
          "url": "https://github.com/VirtualFlow/VirtualFlow"
        },
        {
          "title": "Ringtail result analysis",
          "url": "https://ringtail.readthedocs.io/"
        }
      ]
    },
    {
      "title": "Aggregate the best GNINA pose per compound and create a ranking table",
      "note": "Expects output files named compoundID_conf00.sdf, compoundID_conf01.sdf, etc. It uses each file's first pose (GNINA sorts poses by CNNscore by default, explicitly set above), then selects the highest-CNNscore pose across the prepared conformers of each compound. The resulting list is a ranking hypothesis, not an activity prediction.",
      "code": "import re\nfrom pathlib import Path\nimport pandas as pd\nfrom rdkit import Chem\n\nROOT = Path(\"gnina_screen\")\nrows = []\n\nfor path in sorted(ROOT.glob(\"*.sdf\")):\n    supplier = Chem.SDMolSupplier(str(path), removeHs=False)\n    mol = next((item for item in supplier if item is not None), None)\n    if mol is None:\n        print(f\"SKIP unreadable SDF: {path}\")\n        continue\n\n    def read_num(*keys):\n        for key in keys:\n            if mol.HasProp(key):\n                try:\n                    return float(mol.GetProp(key))\n                except (TypeError, ValueError):\n                    pass\n        return None\n\n    stem = path.stem\n    compound_id = re.sub(r\"_conf\\d+$\", \"\", stem)\n    rows.append({\n        \"compound_id\": compound_id,\n        \"conformer_file\": path.name,\n        \"CNNscore\": read_num(\"CNNscore\", \"CNN_score\"),\n        \"CNNaffinity\": read_num(\"CNNaffinity\", \"CNN_affinity\"),\n        \"minimizedAffinity\": read_num(\"minimizedAffinity\", \"Affinity\"),\n    })\n\nposes = pd.DataFrame(rows)\nif poses.empty or poses[\"CNNscore\"].notna().sum() == 0:\n    raise ValueError(\"No CNNscore property was found; inspect the GNINA SDF fields first.\")\n\n# Pick best conformer per compound using CNNscore (higher is better).\nranked = (poses.dropna(subset=[\"CNNscore\"])\n          .sort_values(\"CNNscore\", ascending=False)\n          .drop_duplicates(\"compound_id\", keep=\"first\")\n          .reset_index(drop=True))\nranked.insert(0, \"rank\", ranked.index + 1)\nranked.to_csv(\"gnina_compound_ranking.csv\", index=False)\nprint(ranked.head(20).to_string(index=False))\n\n# Separately inspect alternative score fields and pose diversity.\n# Do not average CNNscore, CNNaffinity and energy: their meanings/units differ.",
      "links": [
        {
          "title": "GNINA score fields and pose sorting",
          "url": "https://github.com/gnina/gnina"
        }
      ]
    }
  ]
};

    function escapeRecipeHtml(value) {
        return String(value == null ? "" : value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function safeRecipeUrl(value) {
        try {
            const url = new URL(value);
            return url.protocol === "https:" ? url.href : "";
        } catch (error) {
            return "";
        }
    }

    window.renderWorkflowRecipe = function (stepId) {
        const items = recipes[stepId];
        if (!Array.isArray(items) || !items.length) return "";

        return '<div class="planner-code-recipes"><p class="planner-recipe-label">OPTIONAL / HANDS-ON RECIPE</p>' +
            items.map(function (recipe, index) {
                const key = stepId + ":" + index;
                const links = (recipe.links || []).map(function (link) {
                    const url = safeRecipeUrl(link.url);
                    return url
                        ? '<a href="' + escapeRecipeHtml(url) + '" target="_blank" rel="noopener noreferrer">' +
                            escapeRecipeHtml(link.title || url) + ' ↗</a>'
                        : "";
                }).filter(Boolean).join(" · ");
                const body = recipe.type === "guide"
                    ? '<ol class="planner-recipe-steps">' + (recipe.steps || []).map(function (step) {
                        return '<li>' + escapeRecipeHtml(step) + '</li>';
                    }).join("") + '</ol>'
                    : '<div class="planner-code-toolbar"><span>CODE / EXAMPLE</span>' +
                        '<button type="button" class="planner-copy-code" data-copy-workflow-recipe="' +
                            escapeRecipeHtml(key) + '">Copy snippet</button></div>' +
                        '<pre><code>' + escapeRecipeHtml(recipe.code || "") + '</code></pre>';
                return '<details class="planner-code-detail">' +
                    '<summary>' + escapeRecipeHtml(recipe.title) + '</summary>' +
                    '<div class="planner-code-detail-body">' +
                        '<p>' + escapeRecipeHtml(recipe.note || "") + '</p>' +
                        body +
                        (links ? '<p class="planner-recipe-links">' + links + '</p>' : "") +
                    '</div>' +
                '</details>';
            }).join("") +
            '</div>';
    };

    async function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return;
        }
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const copied = document.execCommand("copy");
        area.remove();
        if (!copied) throw new Error("Clipboard access was denied. Select and copy the code manually.");
    }

    document.addEventListener("click", async function (event) {
        const button = event.target.closest("[data-copy-workflow-recipe]");
        if (!button) return;
        const key = button.getAttribute("data-copy-workflow-recipe") || "";
        const parts = key.split(":");
        const stepId = parts[0];
        const recipeIndex = Number(parts[1]);
        const recipe = recipes[stepId] && recipes[stepId][recipeIndex];
        if (!recipe || typeof recipe.code !== "string" || !recipe.code) return;

        const originalText = button.textContent;
        try {
            await copyText(recipe.code);
            button.textContent = "Copied";
        } catch (error) {
            button.textContent = "Select code manually";
            button.setAttribute("title", String(error && error.message || error));
        }
        window.setTimeout(function () { button.textContent = originalText; }, 2200);
    });
})();
