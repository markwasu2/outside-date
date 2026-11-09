import { z } from 'zod';

// ---------------------------------------------------------------------------
// Tuning (section 5)
// ---------------------------------------------------------------------------

export const StageIdSchema = z.enum(['pad', 'steel', 'shell', 'fitout', 'rfs']);

export const StageTuningSchema = z.object({
  id: StageIdSchema,
  costShare: z.number(),
  minMonths: z.number(),
});

export const TierCostRentSchema = z.object({ costMult: z.number(), rentMult: z.number() });
export const CoolingTuningSchema = z.object({
  pue: z.number(),
  capex: z.number().int(),
  droughtTown: z.number(),
  droughtCommission: z.number(),
});
export const PermitTuningSchema = z.object({ months: z.number().int(), baseOdds: z.number() });
export const LowMedHighNumberSchema = z.object({ low: z.number(), medium: z.number(), high: z.number() });

export const TuningSchema = z.object({
  campaign: z.object({
    maxMonths: z.number().int(),
    apPerMonth: z.number().int(),
    startingCash: z.number().int(),
    monthlyBurn: z.number().int(),
  }),
  campus: z.object({ costPerMwIT: z.number().int() }),
  land: z.object({
    megasite: z.number().int(),
    farmland: z.number().int(),
    farmlandExtraPadMonths: z.number().int(),
  }),
  stages: z.array(StageTuningSchema).length(5),
  tiers: z.object({
    air: TierCostRentSchema,
    liquid: TierCostRentSchema,
    hybrid: TierCostRentSchema,
  }),
  chips: z.object({
    liquidReadyCost: z.number().int(),
    hybridLiquidReadyCost: z.number().int(),
  }),
  cooling: z.object({
    evaporative: CoolingTuningSchema,
    dry: CoolingTuningSchema,
    hybrid: CoolingTuningSchema,
  }),
  gc: z.object({ gmpPremium: z.number(), overrunShare: z.number() }),
  permits: z.object({
    air: PermitTuningSchema,
    water: PermitTuningSchema,
    wetlands: PermitTuningSchema,
    building: PermitTuningSchema,
  }),
  docket: z.object({
    monthsToVote: z.number().int(),
    intervenorCount: z.number().int(),
    meetingsToSettle: z.number().int(),
    discoveryOdds: z.number(),
    discoverySlipMonths: z.number().int(),
    testimonyBonus: z.number(),
    testimonyCap: z.number(),
    settleBonus: z.number(),
    voteBase: z.number(),
    minOdds: z.number(),
    maxOdds: z.number(),
    appealMonths: z.number().int(),
    appealBonus: z.number(),
    redesignMonths: z.number().int(),
    redesignCost: z.number().int(),
    redesignBonus: z.number(),
  }),
  power: z.object({
    studyCost: z.number().int(),
    studyMonthsMin: z.number().int(),
    studyMonthsMax: z.number().int(),
    transformerLeadMonths: z.number().int(),
    transformerDeposit: z.number().int(),
    transformerBalance: z.number().int(),
    switchgearLeadMin: z.number().int(),
    switchgearLeadMax: z.number().int(),
    switchgearDeposit: z.number().int(),
    switchgearBalance: z.number().int(),
    cancelFeeShare: z.number(),
    substationBuildMonths: z.number().int(),
    substationCapacityMW: z.number(),
    interimGridMW: z.number(),
    plantBuildMonths: z.number().int(),
    plants: z.array(z.object({ id: z.enum(['A', 'B']), mwGrid: z.number() })),
    plantBOffsetOptions: z.array(z.number().int()),
    slipOdds: LowMedHighNumberSchema,
    slipMonths: LowMedHighNumberSchema,
    minChargePerMwMonth: LowMedHighNumberSchema,
  }),
  capital: z.object({
    seniorOptions: z.array(z.object({ ltc: z.number(), rate: z.number() })),
    mezzOptions: z.array(z.object({ share: z.number(), rate: z.number() })),
    playerShareOptions: z.array(z.number()),
    /** Months between taking a lever and the cash landing. Lead time is the cost of waiting. */
    closingMonths: z.object({ equityCall: z.number().int(), bridgeLoan: z.number().int(), mezzTopUp: z.number().int(), recap: z.number().int() }),
    /** Partner strain: every lever use adds strain, and strain feeds partner_dispute odds. */
    strain: z.object({
      perUse: z.object({ equityCall: z.number(), bridgeLoan: z.number(), mezzTopUp: z.number(), scopeDown: z.number(), recap: z.number() }),
      disputeOddsPerStrain: z.number(),
      /** Share of strain a dispute settles (the rest lingers). */
      settledShare: z.number(),
    }),
    levers: z.object({
      equityCall: z.object({
        maxShareOfCommitted: z.number(),
        maxCalls: z.number().int(),
        cooldownMonths: z.number().int(),
        /** Partner prices new equity at this premium, so your share dilutes by more than the cash raised. */
        premium: z.number(),
        feeRate: z.number(),
        strainPerCall: z.number(),
      }),
      bridgeLoan: z.object({
        maxShareOfCost: z.number(),
        maxLoans: z.number().int(),
        cooldownMonths: z.number().int(),
        rate: z.number(),
        feeRate: z.number(),
      }),
      mezzTopUp: z.object({
        maxShareOfCost: z.number(),
        maxUses: z.number().int(),
        cooldownMonths: z.number().int(),
        ltcCap: z.number(),
        dscrFloor: z.number(),
        ratePremium: z.number(),
        feeRate: z.number(),
      }),
      scopeDown: z.object({
        feeShare: z.number(),
        salvageShare: z.number(),
        tenantGoodwill: z.number(),
        cooldownMonths: z.number().int(),
      }),
      recap: z.object({
        minMonth: z.number().int(),
        minSpentShare: z.number(),
        raiseShareOfCost: z.number(),
        feeRate: z.number(),
        rateStep: z.number(),
        ltcCap: z.number(),
      }),
    }),
  }),
  lease: z.object({
    baseRent: z.number(),
    referenceDeliveryMonth: z.number().int(),
    rentPerMonthEarlier: z.number(),
    firstDeliveryOptions: z.array(z.number().int()),
    hallStaggerMonths: z.number().int(),
    outsideDateMonths: z.number().int(),
    termYears: z.number().int(),
    escalator: z.number(),
    landlordCostShare: z.number(),
    ldPerDayPer25MW: z.number().int(),
    ldCapMonths: z.number().int(),
    extensionGoodwill: z.number(),
    extensionMonths: z.number().int(),
    swapMonths: z.number().int(),
    swapBaseOdds: z.number(),
    swapRentCut: z.number(),
  }),
  insurance: z.object({
    buildersRiskMonthly: z.number().int(),
    dsuMonthly: z.number().int(),
    /** Flat per-claim deductible; small losses (water, theft) are sized to sit inside it. */
    deductible: z.number().int(),
  }),
  forecast: z.object({
    contingencyOptions: z.array(z.number()),
    costCallOptions: z.array(z.number()),
    monthOffsetOptions: z.array(z.number().int()),
    defaultContingency: z.number(),
    /** Upfront lender fee on the senior commitment, capitalized into the loan at close. */
    commitmentFeeRate: z.number(),
    /** Tenant goodwill lost per month you call delivery later than the lease month. */
    lateCallGoodwillPerMonth: z.number(),
    costToComplete: z.object({
      startMonth: z.number().int(),
      /** Shortfall tolerated before the lender calls the loan out of balance, as a share of the cost call. */
      toleranceShare: z.number(),
    }),
  }),
  covenant: z.object({
    dscrTrigger: z.number(),
    permRate: z.number(),
    stepUp: z.number(),
    forcedTestMonth: z.number().int(),
  }),
  takeout: z.object({
    seasoningMonths: z.number().int(),
    baseCapRate: z.number(),
    capRateSwing: z.number(),
    outlookCutBps: z.number(),
    darkValueShare: z.number(),
    greatMultiple: z.number(),
    tierPoints: z.object({ air: z.number(), liquid: z.number(), hybrid: z.number() }),
    coolingPoints: z.object({ evaporative: z.number(), dry: z.number(), hybrid: z.number() }),
    marketBandLow: z.number().int(),
    marketBandHigh: z.number().int(),
  }),
  events: z.object({
    /** Major losses scale with the hit hall's cost (share of that hall's costBudget). */
    stormDamageShare: z.number(),
    fireDamageShare: z.number(),
    /** Small, frequent losses: size drawn uniformly in [min, max] of the hall's costBudget. */
    waterDamageShare: z.tuple([z.number(), z.number()]),
    theftShare: z.tuple([z.number(), z.number()]),
    rateMoveBps: z.number(),
  }),
  crews: z.object({
    importCost: z.number().int(),
    importMonths: z.number().int(),
  }),
});
export type Tuning = z.infer<typeof TuningSchema>;

/** Scenario/difficulty overrides deep-merge into tuning; every field is optional. */
export const TuningOverrideSchema = TuningSchema.deepPartial();
export type TuningOverride = z.infer<typeof TuningOverrideSchema>;

// ---------------------------------------------------------------------------
// Actions (6.1)
// ---------------------------------------------------------------------------

export const ActionTrackSchema = z.enum([
  'land',
  'regulation',
  'power',
  'money',
  'chips',
  'construction',
  'any',
]);

/** Most costs are a fixed dollar amount; a few depend on setup/state and are resolved by the handler. */
export const ActionCashSchema = z.union([z.number().int().nonnegative(), z.literal('dynamic')]);

export const ActionSchema = z.object({
  id: z.string(),
  track: ActionTrackSchema,
  ap: z.number().int().nonnegative(),
  cash: ActionCashSchema,
  label: z.string(),
  help: z.string(),
  handler: z.string(),
  params: z.array(z.string()).optional(),
  requires: z.array(z.string()).optional(),
});
export type ActionDef = z.infer<typeof ActionSchema>;
export const ActionsFileSchema = z.array(ActionSchema);

// ---------------------------------------------------------------------------
// Events (6.2)
// ---------------------------------------------------------------------------

/** The closed set of effect handler names implemented in src/engine/effects.ts. */
export const EffectTypeSchema = z.enum([
  'cash',
  'goodwill',
  'hallProgress',
  'hallCostPct',
  'hallPause',
  'drawFreeze',
  'orderSlip',
  'studySlip',
  'voteSlip',
  'seniorRate',
  'capRate',
  'setFlag',
  'labor',
  'materializeRisk',
  'stormDamage',
  'fireDamage',
  'smallLoss',
  'owedAp',
  'budgetPct',
  'addAskHalls',
  'declineAsk',
  'chipGeneration',
  'playerShare',
]);

export const EffectSchema = z.object({
  type: EffectTypeSchema,
  args: z.array(z.union([z.string(), z.number(), z.boolean()])).default([]),
});
export type Effect = z.infer<typeof EffectSchema>;

export const EventChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  effects: z.array(EffectSchema).default([]),
});

export const EventCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  /** Alternate tellings of `body` (same mechanics, different words). The engine picks one of
   * [body, ...bodyVariants] per occurrence via a seeded, non-advancing flavor pick
   * (src/engine/flavor.ts), so text varies without touching any sim number. */
  bodyVariants: z.array(z.string()).optional(),
  codexId: z.string().optional(),
  art: z.string(),
  /** Monthly draw probability while eligible. Omitted for scripted-only cards. */
  odds: z.number().min(0).max(1).optional(),
  scripted: z.boolean().default(false),
  scriptedMonth: z.number().int().optional(),
  /** For scripted cards that fire on a state trigger rather than a fixed month. */
  scriptedTrigger: z.string().optional(),
  window: z.tuple([z.number().int(), z.number().int()]).optional(),
  /** Inclusive [start, end] of (month % 12). */
  seasonMonths: z.tuple([z.number().int(), z.number().int()]).optional(),
  requires: z.array(z.string()).default([]),
  once: z.boolean().default(false),
  effects: z.array(EffectSchema).default([]),
  choices: z.array(EventChoiceSchema).optional(),
  /** Implementation guidance for mechanics too specific for the generic effect set; see PLAN.md 6.2 row. */
  note: z.string().optional(),
});
export type EventCard = z.infer<typeof EventCardSchema>;
export const EventsFileSchema = z.array(EventCardSchema);

// ---------------------------------------------------------------------------
// Risks (6.4)
// ---------------------------------------------------------------------------

export const RiskHolderSchema = z.enum([
  'you',
  'tenant',
  'insurer',
  'gc',
  'utility',
  'ratepayers',
  'partner',
  'lender',
  'town',
]);

export const RiskDefSchema = z.object({
  id: z.string(),
  label: z.string(),
  defaultHolder: RiskHolderSchema,
  mitigation: z.string(),
  movedBy: z.string().nullable().optional(),
});
export type RiskDef = z.infer<typeof RiskDefSchema>;
export const RisksFileSchema = z.array(RiskDefSchema);

// ---------------------------------------------------------------------------
// Glossary (6.5)
// ---------------------------------------------------------------------------

export const GlossaryEntrySchema = z.object({
  id: z.string(),
  term: z.string(),
  definition: z.string().max(220),
  // P9.4: optional link to a codex.json entry id, for <Term>'s "more" link. Not every term has
  // a matching codex entry - absent means no link.
  codexId: z.string().optional(),
});
export type GlossaryEntry = z.infer<typeof GlossaryEntrySchema>;
export const GlossaryFileSchema = z.array(GlossaryEntrySchema);

// ---------------------------------------------------------------------------
// Codex (6.6)
// ---------------------------------------------------------------------------

export const CodexEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  realAnchor: z.string(),
  sourceUrl: z.string().url(),
  verifiedOn: z.string(),
  needsVerification: z.boolean().optional(),
});
export type CodexEntry = z.infer<typeof CodexEntrySchema>;
export const CodexFileSchema = z.array(CodexEntrySchema);

// ---------------------------------------------------------------------------
// Cast (6.7)
// ---------------------------------------------------------------------------

export const GoodwillGroupSchema = z.enum(['town', 'commission', 'utility', 'tenant']);

export const CastMemberSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  /** One or two lines of personality, surfaced wherever the member's name renders (HUD tooltips,
   * visit feedback). Text only; no mechanics read it. */
  blurb: z.string().optional(),
  goodwillGroup: GoodwillGroupSchema,
  portrait: z.string(),
  lines: z.record(z.enum(['greeting', 'happy', 'worried', 'angry']), z.array(z.string())),
});
export type CastMember = z.infer<typeof CastMemberSchema>;

export const IntervenorDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
});
export type IntervenorDef = z.infer<typeof IntervenorDefSchema>;

export const CastFileSchema = z.object({
  cast: z.array(CastMemberSchema),
  intervenors: z.array(IntervenorDefSchema),
});

// ---------------------------------------------------------------------------
// Scenarios (6.3)
// ---------------------------------------------------------------------------

export const DifficultyIdSchema = z.enum(['easy', 'normal', 'hard']);

export const DifficultyPresetSchema = z.object({
  tuningOverrides: TuningOverrideSchema.optional(),
  flags: z.record(z.string(), z.union([z.boolean(), z.number()])).optional(),
  /** Added to the default goodwill of 50 for that group at game start. */
  goodwillOverrides: z.record(GoodwillGroupSchema, z.number()).optional(),
  forcedSetup: z.object({ site: z.enum(['megasite', 'farmland']).optional() }).optional(),
  /** Multiplies a named event card's base `odds`. */
  eventOddsMultipliers: z.record(z.string(), z.number()).optional(),
});

export const ScriptedEventRefSchema = z.object({
  cardId: z.string(),
  month: z.number().int().optional(),
  trigger: z.string().optional(),
});

export const ScenarioSchema = z.object({
  id: z.string(),
  halls: z.number().int(),
  hallMwIT: z.number(),
  maxMonths: z.number().int(),
  introText: z.string(),
  castIds: z.array(z.string()).optional(),
  scriptedEvents: z.array(ScriptedEventRefSchema).optional(),
  scriptedEffects: z
    .array(z.object({ month: z.number().int(), effects: z.array(EffectSchema) }))
    .optional(),
  difficulties: z.record(DifficultyIdSchema, DifficultyPresetSchema).optional(),
  tuningOverrides: TuningOverrideSchema.optional(),
  docket: z.object({ enabled: z.boolean() }).optional(),
  permitsRequired: z.array(z.string()).optional(),
  skipTransformerOrder: z.boolean().optional(),
  lease: z
    .object({
      firstDeliveryMonth: z.number().int().optional(),
      outsideDateMonths: z.number().int().optional(),
      lateRemedy: z.enum(['liquidatedDamages', 'abatement']).optional(),
    })
    .optional(),
  capital: z
    .object({
      seniorLtc: z.number().optional(),
      playerEquityCash: z.number().int().optional(),
    })
    .optional(),
  coachTips: z.boolean().optional(),
});
export type Scenario = z.infer<typeof ScenarioSchema>;

// ---------------------------------------------------------------------------
// Aggregate content bundle
// ---------------------------------------------------------------------------

export const ContentSchema = z.object({
  tuning: TuningSchema,
  actions: ActionsFileSchema,
  events: EventsFileSchema,
  risks: RisksFileSchema,
  glossary: GlossaryFileSchema,
  codex: CodexFileSchema,
  cast: CastFileSchema,
  scenarios: z.record(z.string(), ScenarioSchema),
});
export type Content = z.infer<typeof ContentSchema>;
