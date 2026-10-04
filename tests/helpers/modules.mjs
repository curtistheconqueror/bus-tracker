/* Every project module the suite asserts against, re-exported from one place.

   The suite used to be a single 15,000-line file whose first fifty lines were
   these imports. Split by area, each file would otherwise repeat the subset it
   needs and the next module move would edit ten import lists instead of one. */

export {noteIssues, normalizeSweepRow, sweepDefect, sweepFindings, sweepOkAgainstBoard} from "../../src/lib/defects/sweep-scan-import.ts";
export {busRow, busUpdatedAt, changedRows, cloudConfigProblem, cloudFailurePhase, cloudStatusLabel, defectLogPayload, defectRow, downSheetPayload, downSheetRow, fleetMapPayload, normalizeCloudConfig, readCloudConfig, readSentFingerprints, rowFingerprint, writeCloudConfig} from "../../src/lib/cloud/cloud-sync.ts";
export {hasBusNumberConflict, hasLocationConflict, validateBusUpdate} from "../../src/lib/fleet/fleet-validation.ts";
export {applyDownEntryToFleet} from "../../src/lib/down-sheet/down-sheet-sync.ts";
export {downSheetBadgeBusIds, downSheetCountLabel, downSheetMembershipMatches, reconcileDownSheetMembership, selectedDownSheetBusIds} from "../../src/lib/down-sheet/down-sheet-counter.ts";
export {syncTrackerDownSheetSelection} from "../../src/lib/down-sheet/tracker-membership-sync.ts";
export {clearDownSheetState, readDownSheetClearSnapshot, restoreDownSheetState} from "../../src/lib/down-sheet/down-sheet-clear.ts";
export {moveOrSwapBuses, roadServiceStatus, statusForLocation} from "../../src/lib/fleet/smart-status.ts";
export {clearFacilityOnlyDefects, facilityOnlyDefectCount, readFacilityDefectClearSnapshot, restoreFacilityOnlyDefects, syncFacilityAlertDefects} from "../../src/lib/fleet/facility-defect-clear.ts";
export {bulkAreaAvailability, bulkRelocateBuses} from "../../src/lib/fleet/bulk-relocation.ts";
export {applyDefectToBuses} from "../../src/lib/defects/bulk-defects.ts";
export {reassignBusPair} from "../../src/lib/fleet/pair-reassignment.ts";
export {CHECK_ENGINE_ISSUES, CHECK_ENGINE_SYMPTOMS, WORK_STATES, FLUID_TOP_UPS, recommendedMinutesElapsed, isFluidTopUp, normalizeFluids, fluidsLabel, isCheckEngineIssue, isDownSheetRecommended, migrateRepairIdentity, normalizeWorkStateStamp, setDownSheetRecommendation, REPAIR_CATEGORY_EMOJI, REPAIR_OPTION_GROUPS, REPAIR_OPTIONS, RETIRED_ISSUES, MINIMUM_DIAGNOSTIC_HOURS, defaultDefectOperability, defectCountField, defectFromDraft, defectNote, normalizeDiagnosticHours, normalizeRepairCount, defectLabel, defectSupportingDetails, defectSummary, defectWorkStates, hasWorkState, normalizeDefects, normalizeFinding, normalizeWorkStates, repairCategoryEmoji, repairCategoryLabel, repairGroupDisplayLabel, repairIssueDisplayLabel, repairGroupPlaceholder, repairGroupStepLabel, repairIssuePlaceholder, repairIssueStepLabel, setDefectWorkState, workStateStampLabel , partNumberMissing, hasDiagLightField, normalizeDiagLight, normalizeAlarmCode, diagLightLabel, deferredMinutesElapsed, isHeldDeferred, isUnresolved, hasDeferredHistory, brakeTestResult, brakeTestFailed, BRAKE_TEST_KEY} from "../../src/lib/defects/repair-catalog.ts";
export {CATALOG_OPTIONS, searchCatalog, searchCategories, searchCatalogForCategory, searchTerms} from "../../src/lib/defects/defect-search.ts";
export {sectionBusCount} from "../../src/lib/fleet/section-count.ts";
export {appendMaintenanceEvent, appendOdometerReading, latestMaintenanceEvent, latestOdometerReading, maintenanceEventsOfKind, normalizeMaintenanceEvents, normalizeOdometerReadings} from "../../src/lib/fleet/domain.ts";
export {ESTIMATED_MILES_PER_OPERATING_DAY, INSPECTION_DAY_INTERVAL, INSPECTION_MILE_INTERVAL, estimatedMileage, inspectionDueStatus} from "../../src/lib/fleet/mileage-estimate.ts";
export {COMPLETION_READING_NOTE, maintenanceCompletionError, recordMaintenanceCompletion} from "../../src/lib/fleet/maintenance-completion.ts";
export {EMPTY_PARTS_MEMORY, PARTS_MEMORY_LIMIT, PARTS_MEMORY_STORAGE_KEY, forgetPart, learnPart, normalizePartsMemory, partMemoryKey, partMemoryLabel, readPartsMemory, recallPart, writePartsMemory} from "../../src/lib/defects/parts-memory.ts";
export {BUS_LIST_COLUMN_LIMIT, BUS_LIST_MAX_HOURS, BUS_LIST_TEMPLATES, busListHours, normalizeBusListHours, setBusListEntryHours, busListTemplateOptions, deleteBusListTemplate, normalizeBusListTemplates, saveBusListTemplate, addBusListEntries, busListColumnCount, busListCounts, busListExportText, createBusList, normalizeBusListColumns, normalizeBusLists, parseBusListInput, setBusListColumns, setBusListEntryCell, setBusListEntryDone} from "../../src/lib/fleet/bus-lists.ts";
export {formatWorkHours, workDayKey, workTimePeople, workTimeRowsFromFleet, workTimeSummary} from "../../src/lib/reports/work-time.ts";
export {DEFAULT_SERVICE_INTERVALS, LEGACY_SERVICE_INTERVALS_UNIT, SERVICE_DUE_SOON_HOURS, SERVICE_INTERVALS_UNIT, readSavedServiceIntervals, SERVICE_KINDS, MAX_PLAUSIBLE_MILES_PER_ENGINE_HOUR, SERVICE_CRITICAL_FRACTION, SERVICE_OVERDUE_FRACTION, SERVICE_SEVERITY_LABELS, engineHourMeterReset, estimateEngineHoursAtMiles, fleetDutyCycle, milesPerEngineHour, monthsBetween, serviceSeverity, normalizeServiceIntervals, serviceIntervalHours, serviceIntervalStatus} from "../../src/lib/fleet/service-intervals.ts";
export {EAST_SLOTS, moveBusToArea, RELOCATION_AREAS, SECTION_SLOTS} from "../../src/lib/fleet/facility-areas.ts";
export {migrateBrakeTowCapacities, migrateReducedCapacity, ROAD_CAPACITY, WEST_CAPACITY} from "../../src/lib/fleet/facility-layout.ts";
export {candidateBusNumbers, resolveBusNumber, resolveBusNumberList} from "../../src/lib/fleet/bus-number-resolver.ts";
export {planOperatorCommand} from "../../src/lib/operator/operator-engine.ts";
export {applyOperatorBatch} from "../../src/lib/operator/operator-batch.ts";
export {operationalUpdateAt, stampOperationalChange} from "../../src/lib/shared/operational-time.ts";
export {formatRepairTime, normalizeRepairTimeEstimate, repairTimeTotal, recommendedRepairMinutes} from "../../src/lib/down-sheet/repair-time-estimates.ts";
export {aggregateRepairItemEstimates, blankRepairItem, isQuarantineEntry, normalizeRepairItems, repairItemsProgress, repairItemsTotal} from "../../src/lib/down-sheet/down-sheet-repair-items.ts";
export {mergeReviewedRows, reviewScannedRows} from "../../src/lib/down-sheet/down-sheet-scan-import.ts";
export {prepareFleetForScannedReplacement, scannedSheetRemovals} from "../../src/lib/down-sheet/down-sheet-replace.ts";
export {DOWN_SHEET_AGING_DAYS, DOWN_SHEET_FILTERS, downSheetEntryAgeDays, downSheetFilterCounts, downSheetFilterEntries, downSheetFilterFromValue, downSheetFilterMatch} from "../../src/lib/down-sheet/down-sheet-filters.ts";
export {downSheetShareContext, downSheetShareFilename, downSheetShareHtml, downSheetShareLines, downSheetShareText} from "../../src/lib/down-sheet/down-sheet-share.ts";
export {RECENT_DUPLICATE_WINDOW_HOURS, RECENT_DUPLICATE_WINDOW_LABEL, activeDefectLogCount, defectLogRecords, groupDefectLogRecords, hideDefectLogRecords, isDefectLogCleanupCandidate, recentDefectDuplicate, returnDefectLogBusToService, saveDefectLogRecord} from "../../src/lib/defects/defect-log-sync.ts";
export {bay12AwarenessBusIds, isBay12AwarenessArea, isMysteryArea, mysteryBusIds} from "../../src/lib/fleet/mystery-buses.ts";
export {reconcileDownSheetMembership as reconcileDS} from "../../src/lib/down-sheet/down-sheet-counter.ts";
export {exportDefectLogPayload, exportDownSheetPayload, exportFleetMapPayload, mergeDefectLog, mergeDownSheet, mergeFleetMap, readTransferPayload, transferFilename, TRANSFER_KINDS} from "../../src/lib/storage/section-transfer.ts";
export {QUICK_FILTER_EVENT, QUICK_FILTER_PARAM, QUICK_FILTERS, quickFilterBusIds, quickFilterDefects, quickFilterFallbackLabel, quickFilterFromValue, quickFilterHref, quickFilterMatch} from "../../src/lib/defects/quick-filters.ts";
export {deferredBadgeCounts, heldDeferredBuses} from "../../src/lib/defects/deferred-counts.ts";
export {readSettings} from "../../src/lib/defects/defect-log-settings.ts";
export {EMPTY_FINDINGS_MEMORY, forgetFinding, learnFinding, normalizeFindingsMemory, recallFindings} from "../../src/lib/defects/findings-memory.ts";
export {downSheetBadgeViewBusIds, downSheetBadgeViewCounts, isReadyRoadLocation} from "../../src/lib/down-sheet/down-sheet-badge-view.ts";
export {DOWN_SHEET_GROUPS, downSheetGroup, downSheetGroupLabel, downSheetGroupRank, downSheetWorkGroup, groupDownSheetEntries, matchesDownSheetSearch, orderDownSheetEntries} from "../../src/lib/down-sheet/down-sheet-view.ts";
export {DEFAULT_DOWN_SHEET_DISPLAY, normalizeDownSheetDisplay} from "../../src/lib/down-sheet/down-sheet-display-settings.ts";
export {DEFAULT_DEFECT_LOG_DISPLAY, normalizeDefectLogDisplay} from "../../src/lib/defects/defect-log-display-settings.ts";
export {quickFilterShareText} from "../../src/lib/defects/quick-filter-share.ts";
export {DOWN_SHEET_STORAGE_KEY, DOWN_SHEET_STORAGE_VERSION, FLEET_BACKUP_REMINDER_STORAGE_KEY, FLEET_RECOVERY_STORAGE_KEY, FLEET_STORAGE_KEY, FLEET_STORAGE_VERSION, FLEET_BACKUP_INTERVAL, FLEET_BACKUP_INTERVAL_CHOICES, normalizeFleetBackupInterval, fleetBackupDue, fleetDefectCount, fleetDefectLogCount, markFleetBackupExported, readDownSheetPayload, readFleetPayload, readFleetRecoverySnapshot, serializeDownSheetPayload, serializeFleetPayload, writeDownSheetStorage, writeFleetStorage} from "../../src/lib/storage/storage.ts";
