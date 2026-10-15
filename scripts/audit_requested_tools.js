#!/usr/bin/env node
"use strict";
const fs = require("node:fs");
const tools = JSON.parse(fs.readFileSync("data/tools.json","utf8"));
const requested = {
  "Target Identification": [
    [
      "Open Targets Platform",
      "Open Targets"
    ],
    [
      "Pharos / TCRD",
      "Pharos",
      "Target Central Resource Database"
    ],
    [
      "Therapeutic Target Database (TTD)",
      "Therapeutic Target Database",
      "TTD"
    ],
    [
      "canSAR",
      "canSAR"
    ],
    [
      "DepMap",
      "DepMap"
    ],
    [
      "Human Protein Atlas",
      "Human Protein Atlas"
    ],
    [
      "DisGeNET",
      "DisGeNET"
    ],
    [
      "UniProt",
      "UniProt"
    ],
    [
      "DrugBank",
      "DrugBank"
    ],
    [
      "STRING",
      "STRING database"
    ],
    [
      "Cytoscape",
      "Cytoscape"
    ],
    [
      "crosstalkr",
      "crosstalkr"
    ],
    [
      "Enrichr",
      "Enrichr"
    ],
    [
      "g:Profiler",
      "g:Profiler",
      "gProfiler"
    ],
    [
      "Reactome",
      "Reactome"
    ],
    [
      "SwissTargetPrediction",
      "SwissTargetPrediction"
    ],
    [
      "SEA (Similarity Ensemble Approach)",
      "SEA",
      "Similarity Ensemble Approach"
    ],
    [
      "LigTMap",
      "LigTMap"
    ],
    [
      "PharmMapper",
      "PharmMapper"
    ],
    [
      "SuperPred",
      "SuperPred"
    ],
    [
      "TargetNet",
      "TargetNet"
    ],
    [
      "PPB2",
      "PPB2"
    ],
    [
      "MolTarPred",
      "MolTarPred"
    ],
    [
      "HumanBase",
      "HumanBase"
    ],
    [
      "ToppGene Suite",
      "ToppGene"
    ],
    [
      "GeneMANIA",
      "GeneMANIA"
    ],
    [
      "FastTargetPred",
      "FastTargetPred"
    ]
  ],
  "Protein Structures": [
    [
      "RCSB PDB",
      "RCSB PDB",
      "Protein Data Bank"
    ],
    [
      "PDBe",
      "PDBe"
    ],
    [
      "PDBj",
      "PDBj"
    ],
    [
      "PDBe-KB",
      "PDBe-KB"
    ],
    [
      "PDB-REDO",
      "PDB-REDO"
    ],
    [
      "EMDB",
      "Electron Microscopy Data Bank",
      "EMDB"
    ],
    [
      "wwPDB validation reports",
      "wwPDB validation"
    ],
    [
      "AlphaFold DB",
      "AlphaFold Protein Structure Database"
    ],
    [
      "3D-Beacons",
      "3D-Beacons"
    ],
    [
      "AlphaFill",
      "AlphaFill"
    ],
    [
      "SWISS-MODEL Repository",
      "SWISS-MODEL Repository"
    ],
    [
      "ModBase",
      "ModBase"
    ],
    [
      "ModelArchive",
      "ModelArchive"
    ],
    [
      "Boltz-2",
      "Boltz-2",
      "Boltz"
    ],
    [
      "OpenFold3",
      "OpenFold3",
      "OpenFold"
    ],
    [
      "ColabFold",
      "ColabFold"
    ],
    [
      "Chai-1",
      "Chai-1"
    ],
    [
      "AlphaFold 3 Server",
      "AlphaFold Server"
    ],
    [
      "ESMFold",
      "ESMFold"
    ],
    [
      "RoseTTAFold All-Atom",
      "RoseTTAFold All-Atom",
      "RoseTTAFold"
    ],
    [
      "OmegaFold",
      "OmegaFold"
    ],
    [
      "I-TASSER",
      "I-TASSER"
    ],
    [
      "COSMIC2",
      "COSMIC2"
    ],
    [
      "SWISS-MODEL",
      "SWISS-MODEL"
    ],
    [
      "MODELLER",
      "MODELLER",
      "Modeller"
    ],
    [
      "Protenix",
      "Protenix"
    ]
  ],
  "Visualization": [
    [
      "UCSF ChimeraX",
      "ChimeraX",
      "UCSF ChimeraX"
    ],
    [
      "PyMOL open-source build",
      "PyMOL"
    ],
    [
      "VMD",
      "VMD"
    ],
    [
      "Avogadro",
      "Avogadro"
    ],
    [
      "Jmol",
      "Jmol"
    ],
    [
      "Swiss-PdbViewer",
      "Swiss-PdbViewer"
    ],
    [
      "BIOVIA Discovery Studio Visualizer",
      "Discovery Studio Visualizer"
    ],
    [
      "Blender + Molecular Nodes",
      "Molecular Nodes"
    ],
    [
      "Mol*",
      "Molstar",
      "Mol*"
    ],
    [
      "3Dmol.js",
      "3Dmol.js"
    ],
    [
      "NGL",
      "NGL Viewer",
      "NGL"
    ],
    [
      "iCn3D",
      "iCn3D"
    ],
    [
      "PDV",
      "PDV"
    ],
    [
      "py3Dmol",
      "py3Dmol"
    ],
    [
      "nglview",
      "nglview"
    ],
    [
      "PLIP",
      "PLIP"
    ],
    [
      "ProLIF",
      "ProLIF"
    ],
    [
      "LigPlot+",
      "LigPlot+"
    ],
    [
      "LeView",
      "LeView"
    ],
    [
      "PoseView",
      "PoseView"
    ],
    [
      "PandaMap",
      "PandaMap"
    ],
    [
      "PDBsum",
      "PDBsum"
    ]
  ],
  "Binding Pockets": [
    [
      "P2Rank / PrankWeb",
      "P2Rank",
      "PrankWeb"
    ],
    [
      "fpocket",
      "fpocket"
    ],
    [
      "mdpocket",
      "mdpocket"
    ],
    [
      "CASTp",
      "CASTp"
    ],
    [
      "DoGSiteScorer",
      "DoGSiteScorer"
    ],
    [
      "KVFinder-web / pyKVFinder",
      "KVFinder",
      "pyKVFinder"
    ],
    [
      "PyVOL",
      "PyVOL"
    ],
    [
      "POVME 2.0",
      "POVME"
    ],
    [
      "DeepPocket",
      "DeepPocket"
    ],
    [
      "GrASP",
      "GrASP"
    ],
    [
      "VN-EGNN",
      "VN-EGNN"
    ],
    [
      "IF-SitePred",
      "IF-SitePred"
    ],
    [
      "lbs-comparison",
      "lbs-comparison"
    ],
    [
      "FTMap",
      "FTMap"
    ],
    [
      "FTFlex",
      "FTFlex"
    ],
    [
      "FTMove",
      "FTMove"
    ],
    [
      "PocketMiner",
      "PocketMiner"
    ],
    [
      "AE-PocketMiner",
      "AE-PocketMiner"
    ],
    [
      "CryptoSite",
      "CryptoSite"
    ],
    [
      "CryptoBench",
      "CryptoBench"
    ],
    [
      "STINGAllo",
      "STINGAllo"
    ],
    [
      "AlloSite",
      "AlloSite"
    ],
    [
      "PASSer",
      "PASSer"
    ],
    [
      "CavityPlus",
      "CavityPlus"
    ]
  ],
  "Structure-Based": [
    [
      "AutoDock Vina",
      "AutoDock Vina",
      "Vina"
    ],
    [
      "GNINA",
      "GNINA"
    ],
    [
      "Smina",
      "Smina"
    ],
    [
      "QuickVina 2",
      "QuickVina 2"
    ],
    [
      "Uni-Dock",
      "Uni-Dock"
    ],
    [
      "AutoDock-GPU",
      "AutoDock-GPU"
    ],
    [
      "Vina-GPU",
      "Vina-GPU"
    ],
    [
      "DOCK 6",
      "DOCK 6",
      "DOCK6"
    ],
    [
      "rDock / RxDock",
      "rDock",
      "RxDock"
    ],
    [
      "PLANTS",
      "PLANTS"
    ],
    [
      "LeDock",
      "LeDock"
    ],
    [
      "HADDOCK / HADDOCK3",
      "HADDOCK"
    ],
    [
      "PyRx",
      "PyRx"
    ],
    [
      "SwissDock",
      "SwissDock"
    ],
    [
      "DockThor-VS",
      "DockThor"
    ],
    [
      "CB-Dock2",
      "CB-Dock2"
    ],
    [
      "MTiOpenScreen",
      "MTiOpenScreen"
    ],
    [
      "iScreen",
      "iScreen"
    ],
    [
      "FlexAutoDock",
      "FlexAutoDock"
    ],
    [
      "Pharmit",
      "Pharmit"
    ],
    [
      "DiffDock / DiffDock-L",
      "DiffDock"
    ],
    [
      "PoseBusters",
      "PoseBusters"
    ],
    [
      "Meeko",
      "Meeko"
    ],
    [
      "MGLTools / AutoDockTools",
      "MGLTools",
      "AutoDockTools"
    ],
    [
      "PDBFixer",
      "PDBFixer"
    ],
    [
      "PDB2PQR / PROPKA",
      "PDB2PQR",
      "PROPKA"
    ],
    [
      "Boltz-2",
      "Boltz-2",
      "Boltz"
    ],
    [
      "OpenFold3",
      "OpenFold3",
      "OpenFold"
    ]
  ],
  "Molecular Dynamics": [
    [
      "GROMACS",
      "GROMACS"
    ],
    [
      "OpenMM",
      "OpenMM"
    ],
    [
      "AmberTools",
      "AmberTools"
    ],
    [
      "NAMD",
      "NAMD"
    ],
    [
      "Desmond",
      "Desmond"
    ],
    [
      "CHARMM-GUI",
      "CHARMM-GUI"
    ],
    [
      "QwikMD",
      "QwikMD"
    ],
    [
      "BioBB Workflows",
      "BioBB"
    ],
    [
      "OpenMMDL",
      "OpenMMDL"
    ],
    [
      "CHAPERONg",
      "CHAPERONg"
    ],
    [
      "OpenMM-Setup",
      "OpenMM-Setup"
    ],
    [
      "MDWeb",
      "MDWeb"
    ],
    [
      "OpenFF (Sage)",
      "OpenFF",
      "Sage force field"
    ],
    [
      "GAFF2 / antechamber",
      "GAFF2",
      "antechamber"
    ],
    [
      "Espaloma",
      "Espaloma"
    ],
    [
      "ACPYPE",
      "ACPYPE"
    ],
    [
      "CGenFF",
      "CGenFF"
    ],
    [
      "LigParGen",
      "LigParGen"
    ],
    [
      "SwissParam",
      "SwissParam"
    ],
    [
      "PLUMED",
      "PLUMED"
    ],
    [
      "OpenFE",
      "OpenFE"
    ],
    [
      "BioSimSpace",
      "BioSimSpace"
    ],
    [
      "BindFlow",
      "BindFlow"
    ],
    [
      "perses",
      "perses"
    ],
    [
      "pymbar",
      "pymbar"
    ],
    [
      "Lomap",
      "Lomap"
    ],
    [
      "gmx_MMPBSA",
      "gmx_MMPBSA"
    ],
    [
      "MMPBSA.py",
      "MMPBSA.py"
    ],
    [
      "MDAnalysis",
      "MDAnalysis"
    ],
    [
      "MDTraj",
      "MDTraj"
    ],
    [
      "cpptraj / pytraj",
      "cpptraj",
      "pytraj"
    ],
    [
      "PyEMMA",
      "PyEMMA"
    ],
    [
      "deeptime",
      "deeptime"
    ],
    [
      "mdpocket",
      "mdpocket"
    ]
  ],
  "Cheminformatics": [
    [
      "RDKit",
      "RDKit"
    ],
    [
      "RDKit.js",
      "RDKit.js"
    ],
    [
      "Open Babel",
      "Open Babel"
    ],
    [
      "CDK",
      "Chemistry Development Kit",
      "CDK"
    ],
    [
      "CDPKit",
      "CDPKit"
    ],
    [
      "OpenChemLib",
      "OpenChemLib"
    ],
    [
      "Kekule.js",
      "Kekule.js"
    ],
    [
      "Datamol",
      "Datamol"
    ],
    [
      "molfeat",
      "molfeat"
    ],
    [
      "scikit-mol",
      "scikit-mol"
    ],
    [
      "DataWarrior",
      "DataWarrior"
    ],
    [
      "KNIME",
      "KNIME"
    ],
    [
      "ChEMBL Structure Pipeline",
      "ChEMBL Structure Pipeline"
    ],
    [
      "MolVS",
      "MolVS"
    ],
    [
      "Mordred",
      "Mordred"
    ],
    [
      "PaDEL",
      "PaDEL"
    ],
    [
      "TMAP",
      "TMAP"
    ],
    [
      "ChemPlot",
      "ChemPlot"
    ],
    [
      "mmpdb",
      "mmpdb"
    ],
    [
      "orbIC",
      "orbIC"
    ],
    [
      "ChemMine Tools",
      "ChemMine Tools"
    ],
    [
      "ChEMBL Beaker",
      "ChEMBL Beaker"
    ],
    [
      "myChEMBL",
      "myChEMBL"
    ],
    [
      "OPSIN",
      "OPSIN"
    ],
    [
      "TeachOpenCADD",
      "TeachOpenCADD"
    ],
    [
      "Ketcher",
      "Ketcher"
    ],
    [
      "JSME",
      "JSME"
    ],
    [
      "CDK Depict",
      "CDK Depict"
    ],
    [
      "Dimorphite-DL",
      "Dimorphite-DL"
    ],
    [
      "chemfp",
      "chemfp"
    ],
    [
      "AIMSim",
      "AIMSim"
    ]
  ],
  "De Novo Design": [
    [
      "REINVENT 4",
      "REINVENT 4",
      "REINVENT4"
    ],
    [
      "DrugEx",
      "DrugEx"
    ],
    [
      "GraphINVENT",
      "GraphINVENT"
    ],
    [
      "MolGPT",
      "MolGPT"
    ],
    [
      "STONED / SELFIES",
      "STONED"
    ],
    [
      "GuacaMol",
      "GuacaMol"
    ],
    [
      "MOSES",
      "MOSES"
    ],
    [
      "DiffSBDD",
      "DiffSBDD"
    ],
    [
      "DrugFlow",
      "DrugFlow"
    ],
    [
      "Pocket2Mol",
      "Pocket2Mol"
    ],
    [
      "TargetDiff",
      "TargetDiff"
    ],
    [
      "PocketFlow",
      "PocketFlow"
    ],
    [
      "MolSnapper",
      "MolSnapper"
    ],
    [
      "MolCRAFT",
      "MolCRAFT"
    ],
    [
      "DiffLinker",
      "DiffLinker"
    ],
    [
      "DeLinker",
      "DeLinker"
    ],
    [
      "AutoGrow4",
      "AutoGrow4"
    ],
    [
      "LigBuilder V3",
      "LigBuilder"
    ],
    [
      "SynFormer",
      "SynFormer"
    ],
    [
      "SynFlowNet",
      "SynFlowNet"
    ],
    [
      "RxnFlow",
      "RxnFlow"
    ],
    [
      "SynNet",
      "SynNet"
    ],
    [
      "GenBench3D",
      "GenBench3D"
    ],
    [
      "PoseBusters",
      "PoseBusters"
    ],
    [
      "SyntaLinker",
      "SyntaLinker"
    ]
  ],
  "Ligand-Based and QSAR": [
    [
      "VSFlow",
      "VSFlow"
    ],
    [
      "SwissSimilarity",
      "SwissSimilarity"
    ],
    [
      "Pharmit",
      "Pharmit"
    ],
    [
      "ZINCPharmer",
      "ZINCPharmer"
    ],
    [
      "LS-align",
      "LS-align"
    ],
    [
      "Shape-it",
      "Shape-it"
    ],
    [
      "Align-it",
      "Align-it"
    ],
    [
      "LIGSIFT",
      "LIGSIFT"
    ],
    [
      "SHAFTS",
      "SHAFTS"
    ],
    [
      "WEGA",
      "WEGA"
    ],
    [
      "PharmaGist",
      "PharmaGist"
    ],
    [
      "OptiPharm",
      "OptiPharm"
    ],
    [
      "virtual-screening-validation",
      "virtual-screening-validation"
    ],
    [
      "Chemprop",
      "Chemprop"
    ],
    [
      "QSARtuna",
      "QSARtuna"
    ],
    [
      "KNIME QSAR workflows",
      "KNIME QSAR"
    ],
    [
      "DeepChem",
      "DeepChem"
    ],
    [
      "scikit-learn",
      "scikit-learn"
    ],
    [
      "scikit-mol",
      "scikit-mol"
    ],
    [
      "OCHEM",
      "OCHEM"
    ],
    [
      "Open3DQSAR",
      "Open3DQSAR"
    ],
    [
      "DataSAIL",
      "DataSAIL"
    ],
    [
      "QSPRpred",
      "QSPRpred"
    ]
  ],
  "ADMET Prediction": [
    [
      "SwissADME",
      "SwissADME"
    ],
    [
      "ADMETlab 3.0",
      "ADMETlab 3.0",
      "ADMETlab"
    ],
    [
      "ADMET-AI",
      "ADMET-AI"
    ],
    [
      "pkCSM",
      "pkCSM"
    ],
    [
      "admetSAR 3.0",
      "admetSAR 3.0"
    ],
    [
      "FAF-Drugs4",
      "FAF-Drugs4"
    ],
    [
      "vNN-ADMET",
      "vNN-ADMET"
    ],
    [
      "ProTox 3.0",
      "ProTox 3.0"
    ],
    [
      "Toxtree",
      "Toxtree"
    ],
    [
      "OPERA",
      "OPERA"
    ],
    [
      "VEGA",
      "VEGA"
    ],
    [
      "OECD QSAR Toolbox",
      "OECD QSAR Toolbox"
    ],
    [
      "EPA T.E.S.T.",
      "EPA T.E.S.T.",
      "T.E.S.T."
    ],
    [
      "BioTransformer 3.0",
      "BioTransformer 3.0",
      "BioTransformer"
    ],
    [
      "SMARTCyp",
      "SMARTCyp"
    ],
    [
      "FAME 3",
      "FAME 3"
    ],
    [
      "GLORYx",
      "GLORYx"
    ],
    [
      "Open Systems Pharmacology",
      "Open Systems Pharmacology",
      "PK-Sim",
      "MoBi"
    ],
    [
      "httk",
      "httk"
    ],
    [
      "PLETHEM",
      "PLETHEM"
    ],
    [
      "MERLIN-Expo",
      "MERLIN-Expo"
    ],
    [
      "TDC ADMET Benchmark Group",
      "TDC ADMET"
    ],
    [
      "OpenADMET",
      "OpenADMET"
    ],
    [
      "Polaris",
      "Polaris"
    ],
    [
      "admetSAR 2.0",
      "admetSAR 2.0"
    ],
    [
      "ADMET-boost",
      "ADMET-boost"
    ],
    [
      "Interpret-ADMET",
      "Interpret-ADMET"
    ],
    [
      "BioTransformer 3.0",
      "BioTransformer"
    ]
  ],
  "Retrosynthesis": [
    [
      "AiZynthFinder",
      "AiZynthFinder"
    ],
    [
      "ASKCOS",
      "ASKCOS"
    ],
    [
      "Syntheseus",
      "Syntheseus"
    ],
    [
      "LillyMol",
      "LillyMol"
    ],
    [
      "IBM RXN for Chemistry",
      "IBM RXN"
    ],
    [
      "Chemical.AI",
      "Chemical.AI"
    ],
    [
      "Molecular Transformer",
      "Molecular Transformer"
    ],
    [
      "Chemformer",
      "Chemformer"
    ],
    [
      "Retro*",
      "Retro*"
    ],
    [
      "LocalRetro",
      "LocalRetro"
    ],
    [
      "Graph2Edits",
      "Graph2Edits"
    ],
    [
      "MEGAN",
      "MEGAN"
    ],
    [
      "LinChemIn",
      "LinChemIn"
    ],
    [
      "SAscore",
      "SAscore",
      "Synthetic Accessibility Score"
    ],
    [
      "SCScore",
      "SCScore"
    ],
    [
      "SYBA",
      "SYBA"
    ],
    [
      "RAscore",
      "RAscore"
    ],
    [
      "BR-SAScore",
      "BR-SAScore"
    ],
    [
      "Synthia",
      "Synthia"
    ],
    [
      "Spaya",
      "Spaya"
    ]
  ],
  "Nomenclature and Format Conversion": [
    [
      "OPSIN",
      "OPSIN"
    ],
    [
      "py2opsin",
      "py2opsin"
    ],
    [
      "NCI/CADD Chemical Identifier Resolver",
      "Chemical Identifier Resolver"
    ],
    [
      "PubChem PUG REST",
      "PubChem PUG REST",
      "PubChemPy"
    ],
    [
      "STOUT V2",
      "STOUT V2"
    ],
    [
      "NISPO",
      "NISPO"
    ],
    [
      "Open Babel",
      "Open Babel"
    ],
    [
      "RDKit",
      "RDKit"
    ],
    [
      "CDK",
      "CDK"
    ],
    [
      "Meeko",
      "Meeko"
    ],
    [
      "InChI / InChIKey",
      "InChI",
      "InChIKey",
      "InChI Software"
    ],
    [
      "SELFIES",
      "SELFIES"
    ],
    [
      "DeepSMILES",
      "DeepSMILES"
    ],
    [
      "MDAnalysis",
      "MDAnalysis"
    ],
    [
      "MDTraj",
      "MDTraj"
    ],
    [
      "ParmEd",
      "ParmEd"
    ],
    [
      "gemmi",
      "gemmi"
    ],
    [
      "DECIMER.ai",
      "DECIMER.ai",
      "DECIMER"
    ],
    [
      "MolScribe",
      "MolScribe"
    ],
    [
      "OSRA",
      "OSRA"
    ],
    [
      "UniChem",
      "UniChem"
    ],
    [
      "PubChem Identifier Exchange Service",
      "PubChem Identifier Exchange"
    ],
    [
      "CAS Common Chemistry",
      "CAS Common Chemistry"
    ],
    [
      "ChEMBL web services",
      "ChEMBL web services",
      "ChEMBL API"
    ],
    [
      "InChI software",
      "InChI"
    ],
    [
      "NCI/CADD Chemical Identifier Resolver",
      "Chemical Identifier Resolver"
    ]
  ],
  "Libraries and Datasets": [
    [
      "ZINC-22",
      "ZINC-22"
    ],
    [
      "ZINC20 informer set",
      "ZINC20"
    ],
    [
      "Enamine REAL",
      "Enamine REAL"
    ],
    [
      "PubChem",
      "PubChem"
    ],
    [
      "PubChem BioAssay",
      "PubChem BioAssay"
    ],
    [
      "ChEMBL",
      "ChEMBL"
    ],
    [
      "DrugBank",
      "DrugBank"
    ],
    [
      "ChemSpider",
      "ChemSpider"
    ],
    [
      "COCONUT 2.0",
      "COCONUT"
    ],
    [
      "LOTUS",
      "LOTUS"
    ],
    [
      "Drug Repurposing Hub",
      "Drug Repurposing Hub"
    ],
    [
      "NCI Open Database",
      "NCI Open Database"
    ],
    [
      "GDB-17",
      "GDB-17"
    ],
    [
      "BindingDB",
      "BindingDB"
    ],
    [
      "Guide to Pharmacology",
      "Guide to Pharmacology",
      "GtoPdb"
    ],
    [
      "Papyrus",
      "Papyrus"
    ],
    [
      "PDBbind",
      "PDBbind"
    ],
    [
      "Binding MOAD",
      "Binding MOAD"
    ],
    [
      "BigBind",
      "BigBind"
    ],
    [
      "CrossDocked2020",
      "CrossDocked2020"
    ],
    [
      "DUD-E",
      "DUD-E"
    ],
    [
      "LIT-PCBA",
      "LIT-PCBA"
    ],
    [
      "CASF-2016",
      "CASF-2016"
    ],
    [
      "Astex Diverse Set",
      "Astex Diverse Set"
    ],
    [
      "PoseBusters benchmark set",
      "PoseBusters benchmark"
    ],
    [
      "DUBS",
      "DUBS"
    ],
    [
      "D3R / CSAR datasets",
      "D3R",
      "CSAR datasets"
    ],
    [
      "DEKOIS 2.0",
      "DEKOIS"
    ],
    [
      "MUV",
      "MUV"
    ],
    [
      "MoleculeNet",
      "MoleculeNet"
    ],
    [
      "Therapeutics Data Commons",
      "Therapeutics Data Commons",
      "TDC"
    ],
    [
      "Tox21",
      "Tox21"
    ],
    [
      "Polaris",
      "Polaris"
    ],
    [
      "OpenADMET",
      "OpenADMET"
    ],
    [
      "DILIrank",
      "DILIrank"
    ],
    [
      "hERG Central",
      "hERG Central"
    ],
    [
      "B3DB",
      "B3DB"
    ],
    [
      "USPTO reactions",
      "USPTO"
    ],
    [
      "Open Reaction Database",
      "Open Reaction Database"
    ],
    [
      "HMDB",
      "HMDB"
    ],
    [
      "awesome-chemistry-datasets",
      "awesome-chemistry-datasets"
    ],
    [
      "awesome-cheminformatics",
      "awesome-cheminformatics"
    ],
    [
      "Database Commons",
      "Database Commons"
    ],
    [
      "QMugs",
      "QMugs"
    ],
    [
      "PLINDER",
      "PLINDER"
    ],
    [
      "PDBbind",
      "PDBbind"
    ],
    [
      "CrossDocked2020",
      "CrossDocked2020"
    ]
  ],
  "Organization": [
    [
      "Chemotion ELN",
      "Chemotion ELN"
    ],
    [
      "Chemotion Repository",
      "Chemotion Repository"
    ],
    [
      "LabIMotion",
      "LabIMotion"
    ],
    [
      "eLabFTW",
      "eLabFTW"
    ],
    [
      "openBIS",
      "openBIS"
    ],
    [
      "Indigo ELN",
      "Indigo ELN"
    ],
    [
      "LabTrove",
      "LabTrove"
    ],
    [
      "Open Enventory",
      "Open Enventory"
    ],
    [
      "RSpace",
      "RSpace"
    ],
    [
      "Jupyter + Git",
      "Jupyter"
    ],
    [
      "KNIME",
      "KNIME"
    ],
    [
      "Snakemake",
      "Snakemake"
    ],
    [
      "Nextflow",
      "Nextflow"
    ],
    [
      "Galaxy",
      "Galaxy"
    ],
    [
      "conda / mamba",
      "conda",
      "mamba"
    ],
    [
      "Docker",
      "Docker"
    ],
    [
      "Git / GitHub",
      "Git",
      "GitHub"
    ],
    [
      "DVC",
      "DVC"
    ],
    [
      "Zotero",
      "Zotero"
    ],
    [
      "JabRef",
      "JabRef"
    ],
    [
      "Obsidian",
      "Obsidian"
    ],
    [
      "Zenodo",
      "Zenodo"
    ],
    [
      "Figshare",
      "Figshare"
    ],
    [
      "OSF",
      "Open Science Framework",
      "OSF"
    ],
    [
      "ChemRxiv",
      "ChemRxiv"
    ],
    [
      "DataLad",
      "DataLad"
    ],
    [
      "Apptainer",
      "Apptainer"
    ],
    [
      "conda-lock",
      "conda-lock"
    ],
    [
      "Pixi",
      "Pixi"
    ]
  ]
};
function norm(v){return String(v||"").toLowerCase().replace(/\(open source\)|open-source/g,"").replace(/[^a-z0-9]+/g,"");}
function matches(record, aliases) {
 const rnames=[norm(record.name),norm(record.id),norm(record.title)];
 return aliases.some(alias=>{
  const a=norm(alias);
  return a && rnames.some(name=>name===a || (a.length>=6 && name.includes(a)));
 });
}
const summary={};
for(const [category,items] of Object.entries(requested)){
 const missing=[],found=[];
 for(const [label,...aliases] of items){
  const record=tools.find(tool=>matches(tool,[label,...aliases]));
  if(record) found.push({label,match:record.name,id:record.id,catalogue:record.catalogue,domain:record.domain||[]});
  else missing.push(label);
 }
 summary[category]={requested:items.length,foundCount:found.length,missingCount:missing.length,missingNames:missing,foundRecords:found};
}
for(const [category,data] of Object.entries(summary)){
 console.log("CATEGORY "+category+" | requested="+data.requested+" | found="+data.foundCount+" | missing="+data.missingCount);
 console.log("MISSING: "+data.missingNames.join(" | "));
 console.log("FOUND RECORDS: "+data.foundRecords.map(x=>x.label+"=>"+x.match+" ["+(x.domain||[]).join(",")+"]").join(" | "));
}
const all=Object.values(summary);
console.log("TOTAL requested="+all.reduce((sum,x)=>sum+x.requested,0)+" found="+all.reduce((sum,x)=>sum+x.foundCount,0)+" missing="+all.reduce((sum,x)=>sum+x.missingCount,0));
console.log("WITHHELD_PENDING_LICENSE_OR_PRIMARY_SOURCE_CONFIRMATION: orbIC | FlexAutoDock | PDV | Open3DQSAR | AlloSite | LeView | SHAFTS | LeDock | BR-SAScore");

