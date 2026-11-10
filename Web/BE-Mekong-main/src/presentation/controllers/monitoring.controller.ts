import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  NotImplementedException,
  Param,
  Query,
} from '@nestjs/common';
import { PositionUseCases } from '../../application/use-cases/position.use-cases';
import { parseTimestamp } from '../date-validation';
import {
  evaluateReferenceGisRule,
  REFERENCE_GIS_RULE_SET,
} from '../../domain/rules/reference-gis-rule-set';
import {
  assertInsidePublicWindow,
  getPublicDataWindow,
  isPublicStationId,
  publicStationIds,
  toPublicStation,
} from '../public-data-policy';

const HOUR = 3_600_000;
const MAX_RANGE = 31 * 24 * HOUR;
const LIMIT = 10000;

function formatObservation(
  observation: import('../../domain/entities/position.entity').PositionData,
) {
  return {
    id: observation.id,
    observedAt: observation.datetime,
    salinity: { value: observation.salinity ?? null, unit: 'mg/L' },
    waterLevel: {
      value: observation.water_level ?? null,
      unit: 'm',
      reference: 'sea_level',
    },
    quality: 'unverified',
  };
}

@Controller('api/v1')
export class MonitoringController {
  constructor(private readonly positions: PositionUseCases) {}

  @Get('stations')
  async stations() {
    const window = getPublicDataWindow();
    const range = await this.positions.getDataRange(
      publicStationIds(),
      window?.from,
      window?.to,
    );
    if (!range.from || !range.to) return { success: true, data: [] };

    const stations = (await this.positions.getAllPositions())
      .map(toPublicStation)
      .filter(
        (station): station is NonNullable<typeof station> => station !== null,
      );
    const snapshots = await this.positions.getSnapshot(
      new Date(range.to),
      new Date(range.from),
    );
    const stationIdsWithData = new Set(
      snapshots
        .filter(({ observation }) => observation !== null)
        .map(({ station }) => station.id),
    );
    return {
      success: true,
      data: stations.filter((station) => stationIdsWithData.has(station.id)),
    };
  }

  @Get('metadata/data-range')
  async dataRange() {
    const window = getPublicDataWindow();
    return {
      success: true,
      data: await this.positions.getDataRange(
        publicStationIds(),
        window?.from,
        window?.to,
      ),
    };
  }

  @Get('observations/snapshot')
  async snapshot(
    @Query('at') atValue: unknown,
    @Query('maxAgeHours') maxAgeValue?: string,
  ) {
    const at = parseTimestamp(atValue, 'at');
    const window = getPublicDataWindow();
    assertInsidePublicWindow(at, at, window);
    const maxAgeHours = maxAgeValue === undefined ? 6 : Number(maxAgeValue);
    if (
      maxAgeValue !== undefined &&
      (typeof maxAgeValue !== 'string' || !/^\d+(?:\.\d+)?$/.test(maxAgeValue))
    )
      throw new BadRequestException(
        'maxAgeHours must be a number between 0 and 168',
      );
    if (!Number.isFinite(maxAgeHours) || maxAgeHours < 0 || maxAgeHours > 168)
      throw new BadRequestException(
        'maxAgeHours must be a number between 0 and 168',
      );
    const requestedEarliest = new Date(at.getTime() - maxAgeHours * HOUR);
    const earliest =
      window && requestedEarliest < window.from
        ? window.from
        : requestedEarliest;
    const rows = await this.positions.getSnapshot(at, earliest);
    return {
      success: true,
      requestedAt: at.toISOString(),
      maxAgeHours,
      data: rows.flatMap(({ station, observation }) => {
        const publicStation = toPublicStation(station);
        return publicStation
          ? [
              {
                station: publicStation,
                observation: observation
                  ? formatObservation(observation)
                  : null,
                status: observation ? 'available' : 'no_data',
              },
            ]
          : [];
      }),
    };
  }

  @Get('stations/:id/observations')
  async observations(
    @Param('id') id: string,
    @Query('from') fromValue: unknown,
    @Query('to') toValue: unknown,
  ) {
    const from = parseTimestamp(fromValue, 'from');
    const to = parseTimestamp(toValue, 'to');
    const window = getPublicDataWindow();
    assertInsidePublicWindow(from, to, window);
    if (!isPublicStationId(id))
      throw new NotFoundException('Station not found');
    if (from > to)
      throw new BadRequestException('from must be before or equal to to');
    if (to.getTime() - from.getTime() > MAX_RANGE)
      throw new BadRequestException('The maximum range is 31 days');
    const rows = await this.positions.getObservations(id, from, to, LIMIT + 1);
    return {
      success: true,
      stationId: id,
      from: from.toISOString(),
      to: to.toISOString(),
      limit: LIMIT,
      truncated: rows.length > LIMIT,
      data: rows.slice(0, LIMIT).map(formatObservation),
    };
  }

  @Get('gis/reference-rules')
  referenceGisRules() {
    return { success: true, data: REFERENCE_GIS_RULE_SET };
  }

  @Get('gis/reference-status')
  async referenceGisStatus(
    @Query('at') atValue: unknown,
    @Query('mode') modeValue?: string,
  ) {
    const at = parseTimestamp(atValue, 'at');
    const window = getPublicDataWindow();
    assertInsidePublicWindow(at, at, window);
    const mode = modeValue ?? 'historical';
    if (mode !== 'historical' && mode !== 'replay') {
      throw new BadRequestException(
        'mode must be either historical or replay; live and forecast are unavailable.',
      );
    }

    const rows = await this.positions.getSnapshot(
      at,
      window?.from ?? new Date(0),
    );
    return {
      success: true,
      mode,
      asOf: at.toISOString(),
      dataKind: 'observed',
      source: 'BaoDinh.csv',
      ruleSet: REFERENCE_GIS_RULE_SET,
      data: rows.flatMap(({ station, observation }) => {
        const publicStation = toPublicStation(station);
        if (!publicStation) return [];
        const formatted = observation ? formatObservation(observation) : null;
        return [
          {
            station: publicStation,
            observation: formatted,
            referenceStatus: evaluateReferenceGisRule(
              station.id,
              formatted?.salinity.value ?? null,
              formatted !== null,
            ),
          },
        ];
      }),
    };
  }

  @Get('stations/:id/forecasts')
  forecasts(@Param('id') id: string) {
    if (!isPublicStationId(id))
      throw new NotFoundException('Station not found');
    throw new NotImplementedException(
      'Forecasts are unavailable until the forecasting pipeline is integrated.',
    );
  }

  @Get('stations/:id/imputations')
  imputations(@Param('id') id: string) {
    if (!isPublicStationId(id))
      throw new NotFoundException('Station not found');
    throw new NotImplementedException(
      'Imputations are unavailable until the imputation pipeline is integrated.',
    );
  }

  @Get('status')
  status() {
    let publicDataWindow = 'not_configured';
    if (process.env.PUBLIC_DATA_START || process.env.PUBLIC_DATA_END) {
      try {
        getPublicDataWindow();
        publicDataWindow = 'configured';
      } catch {
        publicDataWindow = 'invalid';
      }
    }
    return {
      success: true,
      data: {
        api: 'available',
        publicDataWindow,
        measurementProvenance: 'unverified',
        forecasting: 'not_configured',
        imputation: 'not_configured',
        dataModes: {
          historical: 'available',
          replay: 'available',
          live: 'not_configured',
          forecast: 'not_configured',
        },
        gisReferenceRules: {
          version: REFERENCE_GIS_RULE_SET.version,
          confirmationStatus: REFERENCE_GIS_RULE_SET.confirmationStatus,
          intendedUse: REFERENCE_GIS_RULE_SET.intendedUse,
        },
      },
    };
  }
}
