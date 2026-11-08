# MKS Research — Mekong Salinity Monitoring and Hydrological Analytics

**MKS Research** is a university research codebase for studying salinity intrusion and hydrological information systems in the Vietnamese Mekong Delta. Developed at **Ho Chi Minh City University of Technology (HCMUT), VNU-HCM**, it brings together experimental signal-processing code, a QGIS decision-support prototype, and a locally operated web application. The student project also designed and laboratory-tested monitoring hardware; hardware firmware and full integration are **not** established by this repository snapshot.

**Project:** *Research and Development of a Monitoring and Forecasting System for Saltwater Intrusion in the Mekong Delta*  
**Project code:** `SVOISP-2025-CK-19` · **Project period:** June 2025–September 2026 · **Repository release:** October 2026.

> **Research status and scope.** This is a collection of research prototypes, **not** a validated or field-deployed integrated monitoring/forecasting service. The two manuscripts described below have been accepted at their respective conferences, but were not yet published at the reporting date (November 2026). References to simulated UAV-derived data must not be interpreted as measurements acquired by a physical UAV.

## Research background and objectives

Salinity intrusion varies across estuarine locations and on multiple time scales. Physical observation networks, seasonal water-level dynamics, and sluice-gate operations create a need for reliable observations and accessible representations of hydrological conditions. Project objectives are to explore (1) IoT-based monitoring hardware, (2) physics-aware time-series analysis as a foundation for forecasting, (3) location-aware operational decision support, and (4) a web-based hydrological information interface. These objectives have **different evidence and implementation maturity**.

The accompanying website research folder documents stakeholder analysis, a fieldwork review, pain points, user stories, use cases, interface design guidelines, and salinity-monitoring content requirements. They informed prototype design; a documented user story does not establish an implemented feature.

## Components and implementation status

| Component | Implementation evidenced in this snapshot | Important limitation |
|---|---|---|
| IoT monitoring | A separate materials list and project-team confirmation of constructed hardware and laboratory tests | No complete hardware firmware/calibration/field-deployment protocol is demonstrated here |
| **PI-STOF** | Python modules for preprocessing, MSTL decomposition, spectral-temporal grid search, and evaluation | Published full-dataset figures come from the manuscript, not necessarily the provided sample run |
| **GIS decision support** | QGIS project, geospatial/CSV artifacts and Python decision/refresh scripts | UAV-proxy raster is simulated via interpolation; not an autonomous sluice actuator |
| **Web frontend** | React/Vite/TypeScript source, mapping and UI dependencies | Local prototype; no verified production deployment |
| **Web backend** | NestJS, TypeORM entities/repository, PostgreSQL database bootstrap, position/health HTTP endpoints | No verified public API/service-level guarantees; deployment requires configuration |

## Repository structure

```text
full_web_org-main/
├── PI-STOF-Estuarine-Salinity-main/
│   ├── src/                    # preprocessing, decomposition, optimization, evaluation
│   ├── scripts/                # shell wrappers for the Python workflow
│   ├── data/sample/            # sample water-level CSV
│   ├── results/                # tables and manuscript-related figures
│   ├── papers/preprint/        # PI-STOF preprint
│   ├── requirements.txt
│   └── README.md               # detailed PI-STOF methodology/instructions
├── Sanility_GIS_Monitoring/   # name preserved from original repository
│   ├── final.qgz               # QGIS project
│   ├── logicLayer.py           # decision logic
│   ├── realtime.py             # QGIS layer refresh helper
│   ├── script.py               # GIS-related scripting
│   └── *.csv, *.gpkg, *.shp    # research data / spatial artifacts
├── Web/
│   ├── src/                    # React frontend
│   ├── public/                 # frontend static assets
│   ├── package.json
│   └── BE-Mekong-main/
│       ├── src/                # NestJS application and business/domain layers
│       ├── docker-compose.yml  # PostgreSQL service
│       ├── docker/postgres/init/# initialization SQL
│       └── package.json
└── README.md                   # this overview
```

The additional `3_ WEBSITE` research-design folder was supplied separately and may not be present in a GitHub checkout; **do not** assume the ZIP contents are licensed for redistribution.

## Architecture and data flow

```text
Field observations / supplied hydrological datasets
           |                     | 
           |                     +--> PI-STOF water-level preprocessing
           |                          --> MSTL decomposition / physical losses
           |                          --> research feature representations
           |
           +--> QGIS ground station / sluice-gate records
           |        --> simulated spatial salinity proxy (IDW)
           |        --> risk-aware gate decision prototype
           |
           +--> PostgreSQL position + position-data tables
                    --> NestJS API --> React frontend (maps / displays)

Laboratory IoT hardware (separate prototype; end-to-end ingestion not verified)
```

This diagram is an **organization of related components**, not a claim that every arrow is connected in a deployed pipeline.

## Technologies

- **Signal processing:** Python 3.9 (reported environment), pandas, NumPy, SciPy, statsmodels, Matplotlib; FFT/PSD and MSTL/LOESS.
- **GIS:** QGIS project files, Python/PyQGIS, spatial vector layers, CSV observations, inverse distance weighting methodology in the IAAA manuscript.
- **Frontend:** React 19, TypeScript, Vite, TanStack Router/Query, Leaflet/React-Leaflet, MUI and other dependencies declared in `Web/package.json`.
- **Backend:** NestJS 11, TypeORM 0.3, PostgreSQL 17 via Docker Compose; source configuration in `Web/BE-Mekong-main`.

## Installation and usage

Commands below reflect scripts/configurations **present in the snapshot**. They have been inspected against the repository, but this package has **not** undergone a complete multi-module integration test in a clean environment. Run from the stated directories.

### 1. PI-STOF sample pipeline

Use Python 3.9 with a clean environment (the dependency file pins NumPy, SciPy and statsmodels). From the repository root:

```bash
cd PI-STOF-Estuarine-Salinity-main
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt

python -m src.data_preprocessing --input data/sample/raw_sample.csv --output data/processed/clean_sample.csv
python -m src.pi_stof_engine --input data/processed/clean_sample.csv --output results/tables/table_2_grid_search.csv
python -m src.evaluation --input data/processed/clean_sample.csv --figures_dir results/figures --tables_dir results/tables
```

Equivalent Bash entry points exist at `scripts/run_preprocessing.sh`, `scripts/run_grid_search.sh`, and `scripts/generate_results.sh`. The code expects a `Date` index and a `Zxuanhoa` column after preprocessing. The sample contains 2020 hourly measurements; **do not interpret its outputs as a reproduction of full 2019–2024 dataset metrics**. The manuscript reports that potential outliers on the full series were reviewed manually against external domain records; such expert screening is not implemented as an automatic step of the released script.

See [`PI-STOF-Estuarine-Salinity-main/README.md`](PI-STOF-Estuarine-Salinity-main/README.md) for algorithm details and mapping between exported figures/tables and the revised manuscript.

### 2. Web backend

The repository provides an environment-driven NestJS configuration. In a **local development environment**, use the directory below:

```powershell
cd Web/BE-Mekong-main
npm ci
Copy-Item .env.example .env
# Set a private DB_PASSWORD in .env before starting the local database.
docker compose up -d thuyvan-db
npm run start:dev
```

The NestJS entry point uses port **3001** by default (`PORT` can override it). The server config reads `DATABASE_URL`, or the alternative `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, plus `DB_SSL`. `docker-compose.yml` declares PostgreSQL 17 on port 5432 and an initialization SQL mount at `docker/postgres/init/`.

The Docker Compose database binds only to loopback and requires a private local `DB_PASSWORD` in the ignored `.env` file. ORM synchronization is disabled (`synchronize: false`); new databases use the checked-in SQL initialization. Application startup does not run the legacy CSV bootstrap.

The application source declares the following HTTP routes; route-level responses and parameters should be checked in `src/presentation/controllers/`:

- `GET /` (health controller)
- `GET /api/data/positions`
- `GET /api/data/date-range/:date/:startTime/:endTime/:positionId`
- `GET /api/v1/status`, `/api/v1/stations`, `/api/v1/observations/snapshot`, `/api/v1/stations/:id/observations`, `/api/v1/metadata/data-range`, and reserved forecast/imputation routes (see [API contract](Web/BE-Mekong-main/docs/monitoring-api-v1.md))

The Phase 1 demo importer is intentionally separate from app startup. Run `npm run data:demo:check` for a dry run. `npm run data:demo:rebuild` replaces only the monitoring tables and requires the documented explicit confirmation. It loads BaoDinh.csv for June-July 2024, publishes only the three coordinate-confirmed stations, converts source salinity from g/L to mg/L, and keeps water level in meters. See the [API contract](Web/BE-Mekong-main/docs/monitoring-api-v1.md) before applying it.

### 3. Web frontend

```bash
cd Web
npm ci
npm run dev
```

`npm run build`, `npm run preview`, and `npm run check-types` are declared in `package.json`. The frontend reads `VITE_API_BASE_URL`; leave it empty locally to use the Vite `/api/v1` proxy, and set it to the backend's production origin in Vercel. See [deployment and GitHub CI setup](DEPLOYMENT.md) for the frontend/backend project roots, required CI checks, secrets, variables, and smoke tests. A successful Vite development server alone does not prove that the production backend is connected.

### 4. GIS prototype

Install an appropriate **QGIS desktop** version with its Python environment, then inspect and open `Sanility_GIS_Monitoring/final.qgz`. Restore any missing layer paths if they point to the original developer's computer. `logicLayer.py`, `script.py`, and `realtime.py` are research scripts; the refresh helper refers to the QGIS console's `QgsProject` and `iface`, so **it is not a generic standalone Python script**. The snapshot does not contain a verified one-command installer for the full GIS workflow. An included plain-text `readme` mentions `python -m http.server 8000` and `/data.json`; treat this as a development note rather than a validated live-data API contract.

## Research methods and reported results

### PI-STOF — physics-informed decomposition

The optimization uses a near-25-hour component, a 354-hour spring–neap component, and a fixed six-month trend prior. It minimises a sum of diurnal spectral leakage into the fortnightly term, absolute cross-component Pearson correlation, and trend high-frequency energy. The CSoNet manuscript reports **49,680 hourly samples (2019–2024)** from Xuan Hoa station and the following **full-dataset** comparison:

| Metric | Default baseline | Proposed PI-STOF |
|---|---:|---:|
| Composite physical loss | 0.0484 | 0.0181 |
| Spectral leakage | 1.72% | 0.36% |
| Absolute correlation `|r|` | 0.0208 | 0.0108 |

The loss reduction is **62.60%** against pure defaults or **57.91%** against a comparison that also fixes the trend window. These are **decomposition-quality metrics**, not demonstrated improvements in salinity-forecasting error. The source manuscript itself notes that nonlinear dependence may remain and downstream forecasting validation is future work.

### Aerial–ground GIS decision support

The IAAA manuscript evaluates around **2,100 daily decision instances** derived from approximately 52,000 hourly records from nine sluice gates in January–August 2024. A **simulated** UAV-proxy spatial layer is generated through inverse-distance-weighted interpolation. Reported agreement with operator-preferred decisions increased **68.2% → 79.5%**, while a defined unsafe-intake violation rate decreased **12.4% → 6.7%**. Operator agreement is not a universal ground-truth classification accuracy. No physical UAV salinity measurements or live sluice control is demonstrated.

## Data governance and reproducibility

- The full hydrological datasets supplied by the **Tien Giang Irrigation Works Operating Company** and **Southern Institute of Water Resources Research** are **restricted**, unless independently authorized for release.
- The PI-STOF sample under `data/sample/` is described by its subproject README as the openly shareable subset; obtain approval for any other dataset before publishing.
- The GIS folder includes CSV and geospatial files that should be reviewed for redistribution rights, provenance and sensitive infrastructure details before a public push.
- Website planning documents and source maps are also subject to review. Avoid uploading private field notes, raw provider data, credentials, or personal information as part of README publication.
- For independent reproduction, record dataset checksum, Python/QGIS/Node versions, working directory, preprocessing assumptions, experimental variants, and environment configuration. The integrated system has not been evaluated end to end.

## Research contributors and acknowledgments

Project team contributions (as confirmed by the research group): **Nguyen Duy Khang** — team leader, mathematical modelling and methods; **Nguyen Viet Trung** and **Nguyen Dang Thien Hoa** — monitoring hardware; **Nguyen Ngoc Khanh Vy** — design, web and equipment support; **Lam Minh Tung Quan** — web implementation and GIS support; **Phan Ngoc Lan Chi** — GIS, gate decision support and web development.

Academic supervision: **Nguyen Quoc Chi** and **Dr. Khuong Nguyen-An** (supervisors listed in the project proposal). The research background additionally acknowledges research mentoring by **Ngo Luong Thanh Tra**. The team acknowledges the data providers [Tien Giang Irrigation Works Operating Company](http://thuyloitiengiang.vn/) and [Southern Institute of Water Resources Research](https://www.siwrr.org.vn/), and HCMUT/VNU-HCM university support under project `SVOISP-2025-CK-19`.

## Publications and related methodological resources

**Project-related accepted manuscripts (unpublished as of November 2026):**

1. Khang D. Nguyen and Khuong Nguyen-An. *Mitigating Spectral Leakage in MSTL: A Physics-Informed Optimization Framework for Estuarine Water-Level Decomposition.* Accepted at **CSoNet 2026**. Presented by Nguyen Duy Khang. See the manuscript and local PI-STOF paper copy for details.
2. Chi N. L. Phan, Quan M. T. Quan, Khang D. Nguyen and Khuong Nguyen-An. *An Aerial-Ground Decision Support Framework for Salinity-Aware Sluice Gate Operation Using Simulated UAV-Derived Spatial Monitoring.* Accepted at **IAAA 2026**. Presented by Phan Ngoc Lan Chi.

**External methods and literature (not project publications):** [Time Series Library (TSLib)](https://github.com/thuml/Time-Series-Library); Bandara, Hyndman & Bergmeir (MSTL); [Wobbrock and Kientz, *Research Contributions in Human–Computer Interaction*](https://doi.org/10.1145/2907069) for contribution taxonomy; supporting hydrological and machine-learning research referenced in the two manuscripts. External related-work papers should not be listed as team-authored outputs.

## Limitations and future work

Priorities are quantitative IoT calibration and field validation; securing authorized data-release subsets; confirming frontend/backend/GIS integration with reproducible tests; evaluating independent operator references and real aerial observations rather than IDW proxy only; and benchmarking the effects of PI-STOF features in actual short- and long-horizon salinity forecasting models. A production deployment would also require formal security, privacy, reliability, and maintenance reviews.

## License and citation policy

**No repository-wide license has been selected.** The PI-STOF subfolder includes an MIT `LICENSE` file that should be interpreted only according to its own scope; it does **not** automatically license the entire website, GIS data, or external datasets. The NestJS backend package currently declares `UNLICENSED`. Until explicit permission and a repository-wide licensing decision are recorded, **do not assume rights to redistribute or modify all repository content**. Cite the two accepted manuscripts using their current accepted/unpublished status; update proceedings details and DOIs only when officially available.
