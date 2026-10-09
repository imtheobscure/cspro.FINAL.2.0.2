export const MOCK_AVATAR_LESSON_V1 = {
  schemaVersion: "1.0",
  meta: {
    title: "International Executive Negotiations & Tactical Diplomacy",
    subtitle: "Mastering Cross-Cultural Contracts, Strategic Concessions & Diplomatic Phrasing",
    audience: "Upper-Intermediate to Advanced English (B2-C1) Professionals",
    difficulty: "Advanced / Professional",
    estimatedMinutes: 45,
    sourceSummary: "A complete 3-act executive negotiation simulation between British, American, and Australian corporate leadership navigating a high-stakes AI infrastructure contract.",
    authorNote: "Demonstrates conditional clauses, nuanced pushback, hedging, dispute escalation protocols, and dynamic branching."
  },
  characters: [
    {
      id: "char-eleanor",
      name: "Eleanor Vance",
      emoji: "👩‍💼",
      gender: "female",
      accent: "British English (London)",
      voicePresetId: "sonia",
      role: "Chief Legal Officer",
      notes: "Values precision, polite pushback, strict compliance, and formal contractual terminology.",
      baseAffinity: 55
    },
    {
      id: "char-marcus",
      name: "Marcus Sterling",
      emoji: "👨‍💼",
      gender: "male",
      accent: "British English (Manchester)",
      voicePresetId: "ryan",
      role: "Managing Director",
      notes: "Pragmatic dealmaker focused on operational milestones, risk mitigation, and bottom-line velocity.",
      baseAffinity: 60
    },
    {
      id: "char-natasha",
      name: "Natasha Thorne",
      emoji: "👩‍🌾",
      gender: "female",
      accent: "Australian English (Sydney)",
      voicePresetId: "natasha",
      role: "VP of Strategic Partnerships",
      notes: "Direct, high-energy communicator looking for mutual commercial upside, fast market entry, and aggressive expansion.",
      baseAffinity: 50
    },
    {
      id: "char-andrew",
      name: "Andrew Hayes",
      emoji: "👨‍💻",
      gender: "male",
      accent: "American English (San Francisco)",
      voicePresetId: "andrew",
      role: "Chief Technology Architect",
      notes: "Visionary engineering lead, highly protective of proprietary source models, data privacy, and SLA uptime guarantees.",
      baseAffinity: 65
    }
  ],
  lessons: [
    {
      id: "lesson-diplomacy",
      title: "Diplomatic Hedging & Non-Confrontational Pushback",
      accent: "#4f46e5",
      conceptIds: ["concept-hedging", "concept-diplomatic-refusal", "concept-conditional-offers"],
      summary: "Master the art of softening assertiveness using modal auxiliaries, tentative adverbs, and conditional concessions to preserve strategic partnerships.",
      estimatedMinutes: 20,
      blocks: [
        {
          id: "blk-intro-1",
          type: "paragraph",
          body: "In high-stakes corporate negotiations, direct refusal often creates unnecessary friction and defensive posturing. Experienced international negotiators use diplomatic hedging—linguistic buffers that signal openness to dialogue while firmly protecting their commercial boundaries."
        },
        {
          id: "blk-table-1",
          type: "table",
          title: "Direct vs. Diplomatic Phrasing Matrix",
          headers: ["Direct / Risky Statement", "Diplomatic / Buffered Equivalent", "Strategic Function", "Perceived Tone"],
          rows: [
            ["We cannot accept this delivery deadline.", "Given our current supply constraints, meeting that timeline might prove challenging without adjusting the initial scope.", "Scope Rebalancing", "Collaborative & Constructive"],
            ["Your pricing is far too high.", "We may need to explore some creative adjustments to the unit economics to align with our fiscal ceiling.", "Budget Reframing", "Tactical & Polite"],
            ["That clause is completely unacceptable.", "We would have significant reservations regarding that liability exposure as currently drafted.", "Risk Flagging", "Professional & Cautious"],
            ["Give us unlimited API access.", "Subject to mutual data governance safeguards, we would be keen to explore extended query volume allowances.", "Conditional Concession", "Balanced & Value-Driven"]
          ]
        },
        {
          id: "blk-callout-grammar",
          type: "callout",
          calloutType: "grammarStyle",
          title: "Grammar Framework: Modal Modifiers & Past Continuous Softeners",
          body: "Instead of present simple declarations ('I want', 'I think'), employ tentative past continuous framing ('We were wondering if...', 'We were hoping to clarify...') paired with modal auxiliary buffers ('might', 'could', 'would appear to be')."
        },
        {
          id: "blk-def-1",
          type: "definition",
          definitions: [
            { term: "Hedging", definition: "The intentional use of cautious, non-committal language to reduce the risk of confrontational impasse." },
            { term: "Conditional Concession", definition: "Offering a commercial advantage strictly contingent upon receiving an equivalent reciprocal benefit ('If you can... then we could...')." },
            { term: "BATNA", definition: "Best Alternative to a Negotiated Agreement—the fallback threshold that determines your walk-away boundary." }
          ]
        },
        {
          id: "blk-callout-cultural",
          type: "callout",
          calloutType: "cultural",
          title: "Cross-Cultural Communication Dynamics",
          body: "Low-context cultures (e.g., US, Australia) value explicit, straightforward exchanges, whereas high-context cultures (e.g., UK, Japan) rely on understatement and implied subtext. Adapting your cadence to your counterpart prevents unintended offense."
        },
        {
          id: "blk-ordered-list-1",
          type: "orderedList",
          title: "The 4-Step Diplomatic Refusal Protocol",
          items: [
            "Acknowledge & Validate: Demonstrate active listening to the counterpart's core objective.",
            "Signal the Constraint: Introduce the structural limitation using passive voice or modal softeners.",
            "Propose the Counter-Bridge: Offer an alternative scenario that satisfies their underlying intent.",
            "Confirm Alignment: Use a low-friction check question (e.g., 'How would that sit with your leadership team?')."
          ]
        },
        {
          id: "blk-quote-1",
          type: "quote",
          body: "Negotiation is not about winning an argument; it is about steering two divergent agendas toward a single commercially viable future.",
          title: "Executive Harvard Business Review Principle"
        }
      ],
      dialogue: [
        { id: "dlg-1", speakerId: "char-eleanor", text: "Marcus, if we agree to clause 4.2 without an indemnity ceiling, we are exposing the firm to uncapped liability.", emotion: "fear" },
        { id: "dlg-2", speakerId: "char-marcus", text: "I appreciate the legal hazard, Eleanor, but Natasha's team will walk if we stall the rollout past Q3.", emotion: "neutral" },
        { id: "dlg-3", speakerId: "char-natasha", text: "We need momentum, Marcus! If we can lock in the exclusive enterprise tier now, the revenue upside dwarfs the legal risk.", emotion: "joy" },
        { id: "dlg-4", speakerId: "char-andrew", text: "From an engineering standpoint, our cloud infrastructure cannot guarantee 99.999% uptime if you mandate zero-latency cross-border replication.", emotion: "anger" }
      ],
      quickChecks: [
        {
          id: "qc-1",
          question: "Which of the following represents the most effective diplomatic hedge for requesting a pricing discount?",
          options: [
            "Your software is overpriced and we demand a 20% discount.",
            "We were wondering whether there might be some flexibility in the tier pricing if we commit to an annual multi-region contract.",
            "Lower the cost or we will terminate negotiations immediately.",
            "We cannot pay what you asked."
          ],
          answerIndex: 1,
          explanation: "Option 2 uses tentative past continuous framing ('were wondering'), modal softening ('might be'), and pairs the request with a reciprocal commitment ('annual multi-region contract')."
        },
        {
          id: "qc-2",
          question: "What is the primary function of a conditional concession in commercial bargaining?",
          options: [
            "To surrender leverage immediately to build good faith.",
            "To grant a benefit only when an explicit, reciprocal advantage is secured.",
            "To delay the contract signing indefinitely.",
            "To avoid discussing financial terms until the last minute."
          ],
          answerIndex: 1,
          explanation: "Conditional concessions ensure that every compromise made is balanced by a compensatory return value, preserving negotiating equity."
        }
      ]
    },
    {
      id: "lesson-ip-contracts",
      title: "Contractual Safeguards, Liabilities & IP Protection",
      accent: "#059669",
      conceptIds: ["concept-indemnity", "concept-sla-remedies", "concept-escalation"],
      summary: "Formulate binding service level agreements, intellectual property ownership boundaries, and multi-tier dispute escalation procedures.",
      estimatedMinutes: 25,
      blocks: [
        {
          id: "blk-intro-2",
          type: "paragraph",
          body: "When joint innovation takes place across international borders, ambiguity surrounding proprietary weights, derivative datasets, and liability indemnification can destroy multi-million-dollar ventures. Clear contractual mechanisms prevent disputes before code is deployed."
        },
        {
          id: "blk-table-2",
          type: "table",
          title: "Key Contractual Mechanisms in Technology Licensing",
          headers: ["Clause Category", "Standard Commercial Purpose", "High-Risk Exposure", "Recommended Mitigating Formulation"],
          rows: [
            ["Mutual Indemnification", "Protects against third-party patent or copyright claims.", "Uncapped consequential damages.", "Cap liability at 12-24 months of fees paid."],
            ["SLA Service Credits", "Compensates downtime with billing offsets.", "Customer right to immediately terminate.", "Tiered credit schedules with 30-day cure windows."],
            ["Derivative IP Ownership", "Determines who owns custom ML fine-tunings.", "Total loss of proprietary base architecture.", "Client owns bespoke customer weights; vendor retains foundation models."],
            ["Tiered Dispute Escalation", "Mandates executive caucuses prior to formal arbitration.", "Immediate public litigation.", "30-day executive mediation -> ICC arbitration."]
          ]
        },
        {
          id: "blk-callout-vocab",
          type: "callout",
          calloutType: "vocabulary",
          title: "High-Frequency Legal & Governance Lexicon",
          body: "Essential terms: 'Indemnify and hold harmless', 'Consequential and indirect damages', 'Force majeure exclusions', 'Material breach and cure periods', 'Severability clause'."
        },
        {
          id: "blk-callout-strategy",
          type: "callout",
          calloutType: "strategyTips",
          title: "Strategy: The Multi-Stage Escalation Clause",
          body: "Never allow immediate court filing. Structure a graduated funnel: (1) Technical Leads Caucus (7 days) -> (2) C-Suite Mediation (14 days) -> (3) Binding Swiss Arbitration under ICC rules."
        },
        {
          id: "blk-code-1",
          type: "code",
          title: "Sample Balanced Indemnification Boilerplate",
          language: "markdown",
          body: "SECTION 8.2: In no event shall either party's aggregate cumulative liability arising out of or related to this Agreement exceed the total amounts actually paid or payable by Customer in the twelve (12) months preceding the incident giving rise to liability."
        },
        {
          id: "blk-list-1",
          type: "list",
          title: "Pre-Signing Governance Audit Checklist",
          items: [
            "Verification of regional data residency compliance (GDPR, CCPA, APPs).",
            "Establishment of quantitative SLA latency benchmarks with clear telemetry logs.",
            "Explicit separation between Background IP and Foreground Deliverables.",
            "Designation of neutral governing jurisdiction and arbitration forum."
          ]
        }
      ],
      dialogue: [
        { id: "dlg-ip-1", speakerId: "char-andrew", text: "Eleanor, Natasha wants full rights to all synthetic embeddings generated on their cloud tenant.", emotion: "anger" },
        { id: "dlg-ip-2", speakerId: "char-eleanor", text: "That would be a severe compromise of our core IP moat. We can grant an exclusive commercial license, but ownership must remain with us.", emotion: "neutral" },
        { id: "dlg-ip-3", speakerId: "char-natasha", text: "As long as our enterprise customers have unconditional operational continuity, we can accept a perpetual license framework.", emotion: "joy" }
      ],
      quickChecks: [
        {
          id: "qc-ip-1",
          question: "Why do enterprise software vendors insist on a liability cap in mutual indemnification clauses?",
          options: [
            "To prevent the client from paying their monthly subscription.",
            "To ensure that unforeseen third-party claims cannot generate bankrupting financial damages beyond the contract value.",
            "To avoid having to provide any customer support.",
            "To allow the vendor to delete customer databases at will."
          ],
          answerIndex: 1,
          explanation: "Without a liability cap, a single catastrophic outage or breach could result in unlimited consequential damage claims far exceeding the revenue derived from the contract."
        }
      ]
    }
  ],
  scenario: {
    startNode: "node-intro",
    nodes: {
      "node-intro": {
        id: "node-intro",
        type: "context",
        title: "The Zurich Summit: Boardroom Opening",
        body: "You arrive at the executive boardroom overlooking Lake Zurich. Eleanor Vance (Legal), Marcus Sterling (MD), Natasha Thorne (Partnerships), and Andrew Hayes (Architect) are reviewing the final draft of the $50M transatlantic AI venture. The room is tense.",
        lines: [
          { id: "l-intro-1", speakerId: "char-marcus", text: "Welcome everyone. We have three hours before the syndicate wire closes. Let's make sure we find common ground.", emotion: "neutral" },
          { id: "l-intro-2", speakerId: "char-natasha", text: "Our Australian and Asian retail partners are ready to deploy. We need definitive agreement on deployment speed and liability today.", emotion: "joy" }
        ],
        choices: [
          {
            id: "ch-intro-1",
            label: "Open with a balanced, collaborative strategic summary acknowledging both speed and safety.",
            goto: "node-opening-statement",
            hint: "Builds broad cross-functional rapport across legal, technical, and commercial stakeholders.",
            affinity: [
              { characterId: "char-marcus", amount: 10 },
              { characterId: "char-eleanor", amount: 10 }
            ],
            setsFlags: { posture: "balanced" }
          },
          {
            id: "ch-intro-2",
            label: "Engage in informal bilateral alignment with individual leaders before formal opening.",
            goto: "node-informal-bridge",
            hint: "Discovers hidden priorities and personal sensitivities.",
            affinity: [
              { characterId: "char-natasha", amount: 10 },
              { characterId: "char-andrew", amount: 10 }
            ],
            setsFlags: { posture: "inquisitive" }
          }
        ]
      },
      "node-informal-bridge": {
        id: "node-informal-bridge",
        type: "choice",
        title: "Bilateral Alignment Caucus",
        body: "You take 10 minutes to probe the key underlying concerns of both Natasha and Andrew before Eleanor begins formal clause review.",
        lines: [
          { id: "l-inf-1", speakerId: "char-andrew", text: "My only line in the sand is model weights. If our proprietary base model is reverse-engineered or shared, the company is finished.", emotion: "fear" },
          { id: "l-inf-2", speakerId: "char-natasha", text: "And my priority is delivering our Q3 milestone to guarantee syndicate co-funding.", emotion: "neutral" }
        ],
        choices: [
          {
            id: "ch-inf-1",
            label: "Propose an air-gapped container architecture with dedicated tenant telemetry to reassure Andrew.",
            goto: "node-tech-architecture",
            affinity: [{ characterId: "char-andrew", amount: 15 }],
            setsFlags: { airGappedAgreed: true }
          },
          {
            id: "ch-inf-2",
            label: "Transition directly into Eleanor's legal and indemnity review.",
            goto: "node-legal-scrutiny",
            affinity: [{ characterId: "char-eleanor", amount: 10 }]
          }
        ]
      },
      "node-opening-statement": {
        id: "node-opening-statement",
        type: "choice",
        title: "Executive Opening Address",
        body: "You take the floor to establish the tone and negotiation framework for the meeting.",
        choices: [
          {
            id: "ch-open-1",
            label: "Adopt a cautious legal-first stance: 'We must resolve risk indemnity before discussing growth metrics.'",
            goto: "node-legal-scrutiny",
            affinity: [
              { characterId: "char-eleanor", amount: 15 },
              { characterId: "char-natasha", amount: -10 }
            ],
            setsFlags: { legalFirst: true }
          },
          {
            id: "ch-open-2",
            label: "Adopt an aggressive commercial stance: 'Growth is paramount; let us streamline contractual friction to close today.'",
            goto: "node-natasha-rally",
            affinity: [
              { characterId: "char-natasha", amount: 20 },
              { characterId: "char-eleanor", amount: -15 }
            ],
            setsFlags: { speedFirst: true }
          },
          {
            id: "ch-open-3",
            label: "Adopt an engineering-first framework: 'Robust architectural guarantees will naturally de-risk our legal exposure.'",
            goto: "node-tech-architecture",
            affinity: [
              { characterId: "char-andrew", amount: 20 },
              { characterId: "char-marcus", amount: 10 }
            ],
            setsFlags: { techFirst: true }
          }
        ]
      },
      "node-legal-scrutiny": {
        id: "node-legal-scrutiny",
        type: "context",
        title: "Eleanor's Legal Deep-Dive",
        body: "Eleanor Vance opens the compliance dossier and highlights Clause 8: Unlimited Third-Party Indemnification.",
        reinforces: ["concept-hedging", "concept-indemnity"],
        lines: [
          { id: "l-leg-1", speakerId: "char-eleanor", text: "As currently phrased, any IP infringement claim from a regional third party would hold our balance sheet entirely liable.", emotion: "anger" },
          { id: "l-leg-2", speakerId: "char-marcus", text: "What formulation would satisfy your risk threshold without derailing the deal?", emotion: "neutral" }
        ],
        next: "node-indemnity-debate"
      },
      "node-natasha-rally": {
        id: "node-natasha-rally",
        type: "context",
        title: "Natasha's Commercial Acceleration",
        body: "Natasha pushes back vigorously against excessive redlining, emphasizing market timing.",
        reinforces: ["concept-conditional-offers"],
        lines: [
          { id: "l-nat-1", speakerId: "char-natasha", text: "Every day we spend disputing hypothetical liability scenarios is a day our competitors capture regional market share.", emotion: "joy" },
          { id: "l-nat-2", speakerId: "char-andrew", text: "Moving too fast without rigorous testing will cause outages that no marketing campaign can fix.", emotion: "anger" }
        ],
        next: "node-schedule-crisis"
      },
      "node-tech-architecture": {
        id: "node-tech-architecture",
        type: "context",
        title: "Andrew's Infrastructure Blueprint",
        body: "Andrew presents the SLA telemetry model and data partition strategy.",
        reinforces: ["concept-sla-remedies"],
        lines: [
          { id: "l-tch-1", speakerId: "char-andrew", text: "We can deliver 99.99% uptime, provided we have a 4-hour scheduled maintenance window per month and isolated dedicated tenants.", emotion: "neutral" },
          { id: "l-tch-2", speakerId: "char-eleanor", text: "And how do we legally demarcate customer data from base model fine-tunings?", emotion: "neutral" }
        ],
        next: "node-ip-split"
      },
      "node-indemnity-debate": {
        id: "node-indemnity-debate",
        type: "choice",
        title: "The Indemnity Liability Cap Decision",
        body: "The board turns to you to formulate the definitive compromise on liability caps and damages.",
        reinforces: ["concept-diplomatic-refusal", "concept-indemnity"],
        choices: [
          {
            id: "ch-ind-1",
            label: "Propose a reciprocal 12-month rolling fee cap with an insurance-backed super-cap for gross negligence.",
            goto: "node-consequence-balanced",
            hint: "The gold standard in enterprise SaaS contracting—satisfies both Eleanor and Natasha.",
            affinity: [
              { characterId: "char-eleanor", amount: 15 },
              { characterId: "char-marcus", amount: 15 },
              { characterId: "char-natasha", amount: 10 }
            ],
            setsFlags: { balancedIndemnity: true }
          },
          {
            id: "ch-ind-2",
            label: "Cave completely to Natasha's demand for uncapped indemnity to accelerate closing.",
            goto: "node-consequence-high-risk",
            affinity: [
              { characterId: "char-natasha", amount: 20 },
              { characterId: "char-eleanor", amount: -25 },
              { characterId: "char-marcus", amount: -15 }
            ],
            setsFlags: { recklessIndemnity: true }
          }
        ]
      },
      "node-schedule-crisis": {
        id: "node-schedule-crisis",
        type: "choice",
        title: "Delivery Timeline & Phased Milestone Compromise",
        body: "Natasha demands a full Q3 release, while Andrew insists Q3 will only support an MVP beta.",
        choices: [
          {
            id: "ch-sch-1",
            label: "Structure a Phased Beta Rollout: Q3 pilot with enterprise SLA guarantees launching in Q4.",
            goto: "node-consequence-balanced",
            affinity: [
              { characterId: "char-natasha", amount: 15 },
              { characterId: "char-andrew", amount: 15 }
            ],
            setsFlags: { phasedRollout: true }
          },
          {
            id: "ch-sch-2",
            label: "Force Andrew to commit to immediate full rollout with round-the-clock overtime.",
            goto: "node-consequence-high-risk",
            affinity: [
              { characterId: "char-andrew", amount: -30 },
              { characterId: "char-natasha", amount: 10 }
            ],
            setsFlags: { forcedTimeline: true }
          }
        ]
      },
      "node-ip-split": {
        id: "node-ip-split",
        type: "choice",
        title: "Intellectual Property Demarcation",
        body: "You must establish clear boundaries between Background Foundation IP and Foreground Customer Embeddings.",
        choices: [
          {
            id: "ch-ip-1",
            label: "Execute dual-custody framework: Foundation models remain 100% proprietary; client owns bespoke fine-tuned weights.",
            goto: "node-consequence-balanced",
            affinity: [
              { characterId: "char-andrew", amount: 20 },
              { characterId: "char-eleanor", amount: 15 }
            ],
            setsFlags: { dualIpAgreed: true }
          },
          {
            id: "ch-ip-2",
            label: "Grant exclusive ownership of all derivative fine-tunings and foundation adaptors to the client.",
            goto: "node-consequence-high-risk",
            affinity: [
              { characterId: "char-andrew", amount: -25 },
              { characterId: "char-eleanor", amount: -20 }
            ],
            setsFlags: { ipSurrendered: true }
          }
        ]
      },
      "node-consequence-balanced": {
        id: "node-consequence-balanced",
        type: "consequence",
        title: "Consensus Reached on Commercial & Legal Architecture",
        body: "The executive team nods in approval. Your structured compromise provides sufficient legal insulation while giving Natasha the commercial agility needed to satisfy syndicate investors.",
        reinforces: ["concept-escalation"],
        lines: [
          { id: "l-cbal-1", speakerId: "char-marcus", text: "Superb stewardship. We have protected our downside without sacrificing our upside.", emotion: "joy" },
          { id: "l-cbal-2", speakerId: "char-eleanor", text: "I can endorse this draft to our audit committee without hesitation.", emotion: "joy" }
        ],
        next: "node-final-vote"
      },
      "node-consequence-high-risk": {
        id: "node-consequence-high-risk",
        type: "consequence",
        title: "Deep Friction & Executive Division",
        body: "Your proposal creates severe imbalances. Eleanor threatens to invoke her veto on the legal committee, while Andrew warns of imminent team resignations under unrealistic technical burdens.",
        lines: [
          { id: "l-crsk-1", speakerId: "char-eleanor", text: "This structure creates existential risk for our shareholders. I cannot sign this.", emotion: "anger" },
          { id: "l-crsk-2", speakerId: "char-andrew", text: "Our engineering integrity is not a bargaining chip.", emotion: "anger" }
        ],
        next: "node-emergency-caucus"
      },
      "node-emergency-caucus": {
        id: "node-emergency-caucus",
        type: "choice",
        title: "Emergency Mediation Caucus",
        body: "With 30 minutes remaining before syndicate wire deadline, you must initiate emergency dispute escalation.",
        reinforces: ["concept-escalation"],
        choices: [
          {
            id: "ch-em-1",
            label: "Invoke 30-day executive arbitration clause and reset terms to standard balanced market terms.",
            goto: "node-final-vote",
            affinity: [
              { characterId: "char-marcus", amount: 10 },
              { characterId: "char-eleanor", amount: 10 }
            ],
            setsFlags: { savedAtBrink: true }
          },
          {
            id: "ch-em-2",
            label: "Refuse further concessions and force a showdown vote.",
            goto: "node-ending-collapse",
            affinity: [
              { characterId: "char-eleanor", amount: -20 },
              { characterId: "char-andrew", amount: -20 }
            ]
          }
        ]
      },
      "node-final-vote": {
        id: "node-final-vote",
        type: "choice",
        title: "The Formal Signing Ceremony",
        body: "The final clean contract is displayed on the boardroom screens. The syndicate wire transfer is queued.",
        choices: [
          {
            id: "ch-vote-1",
            label: "Sign the unified agreement and toast the international alliance.",
            goto: "node-ending-triumph",
            affinity: [
              { characterId: "char-marcus", amount: 20 },
              { characterId: "char-natasha", amount: 15 },
              { characterId: "char-eleanor", amount: 15 }
            ]
          },
          {
            id: "ch-vote-2",
            label: "Sign with conditional quarterly review riders.",
            goto: "node-ending-compromise",
            affinity: [{ characterId: "char-eleanor", amount: 10 }]
          },
          {
            id: "ch-vote-3",
            label: "Abstain and recommend a 60-day pause for further audit.",
            goto: "node-ending-deadlock"
          }
        ]
      },
      "node-ending-triumph": {
        id: "node-ending-triumph",
        type: "ending",
        title: "Unanimous Partnership Ratification & $50M Syndicate Formed",
        body: "Eleanor, Marcus, Natasha, and Andrew sign the agreement unanimously. The syndicate releases $50M in expansion funding. Your masterclass in diplomatic hedging, risk allocation, and multi-lateral negotiation has positioned the venture for sustained global success.",
        endingStyle: "success"
      },
      "node-ending-compromise": {
        id: "node-ending-compromise",
        type: "ending",
        title: "Conditional Alliance with Strict Quarterly Audits",
        body: "The contract is ratified with strict governance oversight covenants. While rollout will proceed with measured caution, the partnership remains intact with solid legal protections.",
        endingStyle: "bittersweet"
      },
      "node-ending-deadlock": {
        id: "node-ending-deadlock",
        type: "ending",
        title: "Negotiations Stalled & Referred to Advisory Council",
        body: "Failure to reach conclusive consensus forces a 60-day freeze. Key market opportunities in Asia are delayed, but neither party suffered catastrophic liability exposure.",
        endingStyle: "warning"
      },
      "node-ending-collapse": {
        id: "node-ending-collapse",
        type: "ending",
        title: "Hostile Walkout & Alliance Dissolution",
        body: "Eleanor and Andrew walk out of the boardroom after unmanaged friction. The syndicate withdraws its funding offer, and the international venture is formally terminated.",
        endingStyle: "tragic"
      }
    },
    coverageRules: [
      {
        conceptId: "concept-hedging",
        lessonId: "lesson-diplomacy",
        requiredNodeIds: ["node-legal-scrutiny"]
      },
      {
        conceptId: "concept-diplomatic-refusal",
        lessonId: "lesson-diplomacy",
        requiredNodeIds: ["node-indemnity-debate"]
      },
      {
        conceptId: "concept-conditional-offers",
        lessonId: "lesson-diplomacy",
        requiredNodeIds: ["node-natasha-rally"]
      },
      {
        conceptId: "concept-indemnity",
        lessonId: "lesson-ip-contracts",
        requiredNodeIds: ["node-legal-scrutiny", "node-indemnity-debate"]
      },
      {
        conceptId: "concept-sla-remedies",
        lessonId: "lesson-ip-contracts",
        requiredNodeIds: ["node-tech-architecture"]
      },
      {
        conceptId: "concept-escalation",
        lessonId: "lesson-ip-contracts",
        requiredNodeIds: ["node-consequence-balanced", "node-emergency-caucus"]
      }
    ]
  }
};

export const MOCK_AVATAR_LESSON_V2 = {
  schemaVersion: "2.0",
  meta: {
    title: "Constructive Workplace Feedback & Problem Solving",
    subtitle: "Deliver clear feedback, resolve disagreements, and build team consensus",
    audience: "Intermediate to Advanced Professionals (B2-C1)",
    difficulty: "Professional Communication",
    estimatedMinutes: 25,
    sourceSummary: "A practical workplace scenario where you navigate project deadlines, balance differing technical and design viewpoints, and align team priorities.",
    defaultTheme: "light"
  },
  narrator: {
    id: "narrator",
    name: "Ava",
    fixedVoice: "ava",
    defaultEmoji: "🎙️",
    moodEmojiMap: {
      neutral: "🎙️",
      joy: "😊",
      anger: "⚡",
      fear: "💡",
      love: "🤝",
      sadness: "💭",
      shock: "❗",
      triumph: "🎉"
    },
    dockPosition: "bottom-left"
  },
  characters: [
    {
      id: "char-sarah",
      name: "Sarah Jenkins",
      emoji: "👩‍💼",
      gender: "female",
      accent: "American English",
      voicePresetId: "jenny",
      fixedVoice: true,
      role: "Project Director",
      notes: "Focuses on delivery schedules, team alignment, and clear actionable milestones.",
      introText: "Hello! I am Sarah, the Project Director. In this lesson, we will practice delivering feedback that keeps projects on track while maintaining great team relationships.",
      baseAffinity: 50
    },
    {
      id: "char-david",
      name: "David Chen",
      emoji: "👨‍💻",
      gender: "male",
      accent: "American English",
      voicePresetId: "guy",
      fixedVoice: true,
      role: "Lead Software Engineer",
      notes: "Values technical accuracy, realistic estimates, and direct problem-solving.",
      introText: "Hi, I am David, the Lead Software Engineer. I will share how engineering teams handle feedback and how objective data prevents misunderstandings.",
      baseAffinity: 50
    },
    {
      id: "char-elena",
      name: "Elena Rostova",
      emoji: "🎨",
      gender: "female",
      accent: "British English",
      voicePresetId: "sonia",
      fixedVoice: true,
      role: "Senior Product Designer",
      notes: "Advocates for user experience quality, accessibility, and thoughtful design refinement.",
      introText: "Greetings! I am Elena, Senior Product Designer. I will help you balance empathy and clarity when reviewing design choices and discussing compromises.",
      baseAffinity: 50
    },
    {
      id: "char-marcus",
      name: "Marcus Vance",
      emoji: "📊",
      gender: "male",
      accent: "British English",
      voicePresetId: "ryan",
      fixedVoice: true,
      role: "Operations Manager",
      notes: "Specializes in workflow efficiency, stakeholder updates, and cross-team coordination.",
      introText: "Hello everyone! I am Marcus, Operations Manager. Let us practice how to facilitate meetings where everyone leaves aligned on the next steps.",
      baseAffinity: 50
    }
  ],
  lessons: [
    {
      id: "v2-lesson-feedback",
      title: "Framing Constructive Feedback with the SBI Model",
      accent: "#2563eb",
      theme: "light",
      conceptIds: ["concept-sbi", "concept-softeners", "concept-actionable"],
      summary: "Use the Situation-Behavior-Impact (SBI) framework to deliver objective, helpful feedback without causing defensiveness.",
      objective: "Learn how to structure professional feedback clearly and propose collaborative next steps.",
      estimatedMinutes: 12,
      blocks: [
        {
          id: "blk-sbi-intro",
          type: "paragraph",
          body: "Effective feedback focuses on observable actions and concrete results rather than personal assumptions. The Situation-Behavior-Impact (SBI) model helps you stay objective and respectful."
        },
        {
          id: "blk-sbi-def",
          type: "definition",
          definitions: [
            {
              term: "Situation (S)",
              definition: "Anchor your feedback to a specific time, place, or meeting.",
              usageExample: "During yesterday sprint planning session..."
            },
            {
              term: "Behavior (B)",
              definition: "Describe the specific, observable action without judging intention.",
              usageExample: "...the updated API documentation was not linked in the ticket..."
            },
            {
              term: "Impact (I)",
              definition: "Explain the practical result and propose a joint path forward.",
              usageExample: "...which delayed testing by two days. Let us establish a shared checklist."
            }
          ]
        },
        {
          id: "blk-sbi-table",
          type: "table",
          title: "Phrasing Comparison: Accusatory vs. Constructive",
          headers: ["Avoid (Accusatory)", "Recommended (Constructive)", "Why It Works"],
          rows: [
            [
              "You never finish tasks on time.",
              "I noticed the module was submitted after the deadline.",
              "Focuses on the event, not personal traits."
            ],
            [
              "Your design is too complicated.",
              "Users might find this step confusing based on our usability tests.",
              "Brings data and user perspective into the discussion."
            ],
            [
              "You need to fix this immediately.",
              "What can we adjust together to resolve this by Friday?",
              "Invites collaboration and mutual ownership."
            ]
          ]
        },
        {
          id: "blk-sbi-callout",
          type: "callout",
          calloutType: "communication",
          title: "Communication Tip: Using Softening Phrases",
          body: "Phrases like 'I would suggest...', 'From my perspective...', and 'Could we explore...' help open a constructive dialogue without diminishing the importance of your feedback."
        }
      ],
      dialogue: [
        {
          id: "d1-1",
          speakerId: "char-sarah",
          text: "David, during yesterday demo, the checkout page loaded slowly, which concerned our stakeholders.",
          emotion: "neutral"
        },
        {
          id: "d1-2",
          speakerId: "char-david",
          text: "I understand. We added heavy analytics tracking late Tuesday, which caused the slowdown.",
          emotion: "neutral"
        },
        {
          id: "d1-3",
          speakerId: "char-elena",
          text: "Could we optimize the image assets and defer non-critical scripts to bring load times down?",
          emotion: "joy"
        },
        {
          id: "d1-4",
          speakerId: "char-sarah",
          text: "That sounds like a great plan. Let us benchmark the performance tomorrow morning.",
          emotion: "triumph"
        }
      ],
      narration: [
        {
          id: "nar-1",
          text: "Notice how Sarah clearly identified the situation and result without placing blame, allowing David and Elena to offer immediate solutions.",
          mood: "joy",
          auto: true
        }
      ],
      quickChecks: [
        {
          id: "qc-1",
          question: "Which of the following best follows the Situation-Behavior-Impact (SBI) framework?",
          options: [
            "In today standup, the timeline was not updated, which made it difficult to schedule the QA review.",
            "You always forget to update the project timeline.",
            "The project is late again because people are not paying attention."
          ],
          answerIndex: 0,
          explanation: "Option 1 clearly states the specific situation (standup), the behavior (timeline not updated), and the tangible impact (QA scheduling difficulty)."
        }
      ]
    },
    {
      id: "v2-lesson-consensus",
      title: "Navigating Conflicting Priorities & Building Consensus",
      accent: "#0d9488",
      theme: "light",
      conceptIds: ["concept-compromise", "concept-active-listening", "concept-alignment"],
      summary: "Explore strategies for resolving differing opinions between engineering, design, and product teams.",
      objective: "Master diplomatic language to summarize viewpoints, identify shared goals, and reach agreement.",
      estimatedMinutes: 15,
      blocks: [
        {
          id: "blk-con-p1",
          type: "paragraph",
          body: "When team members have competing priorities (such as speed vs. feature depth), successful leaders summarize all perspectives before proposing a balanced middle ground."
        },
        {
          id: "blk-con-phrases",
          type: "definition",
          definitions: [
            {
              term: "Acknowledging Concerns",
              definition: "Validating the other person perspective before stating your own.",
              usageExample: "I completely see why reducing technical debt is crucial for stability..."
            },
            {
              term: "Bridging Differences",
              definition: "Finding common objectives that both parties care about.",
              usageExample: "...and at the same time, we need to meet our client launch commitment."
            },
            {
              term: "Proposing a Phased Solution",
              definition: "Breaking the resolution into manageable phases.",
              usageExample: "How about we ship the core workflow in Phase 1 and enhance the animations in Phase 2?"
            }
          ]
        },
        {
          id: "blk-con-callout",
          type: "callout",
          calloutType: "strategyTips",
          title: "Facilitator Rule of Thumb",
          body: "Never dismiss an engineer technical warning or a designer usability finding as unimportant. Instead, ask: What is the risk if we proceed this way, and what is our backup plan?"
        }
      ],
      dialogue: [
        {
          id: "d2-1",
          speakerId: "char-elena",
          text: "If we simplify the onboarding animations, new users might miss our key feature highlights.",
          emotion: "fear"
        },
        {
          id: "d2-2",
          speakerId: "char-david",
          text: "I understand Elena concern, but building full custom animations will add two weeks to our timeline.",
          emotion: "neutral"
        },
        {
          id: "d2-3",
          speakerId: "char-marcus",
          text: "What if we use lightweight CSS transitions for the launch, and test full interactive illustrations in the next sprint?",
          emotion: "joy"
        },
        {
          id: "d2-4",
          speakerId: "char-elena",
          text: "That is a fair compromise. It protects our release date while keeping the interface polished.",
          emotion: "triumph"
        }
      ],
      narration: [
        {
          id: "nar-2",
          text: "Marcus effectively bridged the gap by proposing a phased approach that addressed both timeline and visual quality.",
          mood: "triumph",
          auto: true
        }
      ],
      quickChecks: [
        {
          id: "qc-2",
          question: "When two team members disagree on feature scope, what is the best opening phrase?",
          options: [
            "Let us look at our shared goal for this milestone and find a realistic middle ground.",
            "We have to pick one person idea and move on quickly.",
            "This argument is wasting valuable sprint time."
          ],
          answerIndex: 0,
          explanation: "Focusing on shared goals and an actionable middle ground creates collaboration rather than winners and losers."
        }
      ]
    }
  ],
  scenario: {
    startNode: "node-1-opening",
    nodes: {
      "node-1-opening": {
        id: "node-1-opening",
        type: "context",
        act: 1,
        title: "The Project Alignment Meeting",
        body: "Your team is two weeks away from launch. During the morning review, David announces that unexpected backend integration hurdles have created a 4-day delay, while Elena expresses worry about releasing an incomplete design.",
        speakerId: "char-sarah",
        lines: [
          {
            id: "l-open-1",
            speakerId: "char-sarah",
            text: "Thanks for joining everyone. We have a timeline constraint with the backend, and we need to agree on our path forward today.",
            emotion: "neutral"
          },
          {
            id: "l-open-2",
            speakerId: "char-david",
            text: "The payment gateway integration requires extra security verification. Rushing it could create vulnerabilities.",
            emotion: "fear"
          },
          {
            id: "l-open-3",
            speakerId: "char-elena",
            text: "And if we cut the user onboarding tour to save time, first-time user retention will drop.",
            emotion: "sadness"
          }
        ],
        choices: [
          {
            id: "c-open-collaborative",
            label: "Facilitate a joint review: ask David for critical requirements and Elena for minimum viable design.",
            goto: "node-2-collaborative",
            hint: "Collaborative and structured approach",
            affinity: [
              { characterId: "char-sarah", amount: 10 },
              { characterId: "char-david", amount: 10 },
              { characterId: "char-elena", amount: 10 }
            ]
          },
          {
            id: "c-open-technical-focus",
            label: "Prioritize backend security first, suggesting design polish wait for version 1.1.",
            goto: "node-3-tech-focus",
            hint: "Technical stability focus",
            affinity: [
              { characterId: "char-david", amount: 15 },
              { characterId: "char-elena", amount: -5 }
            ]
          },
          {
            id: "c-open-strict-deadline",
            label: "Insist that both teams work overtime to meet the original launch date without cuts.",
            goto: "node-4-pressure",
            hint: "High-pressure directive approach",
            affinity: [
              { characterId: "char-sarah", amount: -5 },
              { characterId: "char-david", amount: -15 },
              { characterId: "char-elena", amount: -15 }
            ]
          }
        ]
      },
      "node-2-collaborative": {
        id: "node-2-collaborative",
        type: "choice",
        act: 2,
        title: "Defining Core Priorities Together",
        body: "The team appreciates the balanced opening. David details that only the automated token refresh needs 2 extra days, while Elena shares a streamlined 3-step onboarding flow.",
        speakerId: "char-marcus",
        lines: [
          {
            id: "l-collab-1",
            speakerId: "char-marcus",
            text: "This breakdown makes the gap much smaller than we thought. We only need to cover about 36 hours of engineering time.",
            emotion: "joy"
          },
          {
            id: "l-collab-2",
            speakerId: "char-elena",
            text: "I can deliver the simplified onboarding screens by tomorrow afternoon if David confirms the field requirements.",
            emotion: "joy"
          }
        ],
        choices: [
          {
            id: "c-collab-phased-rollout",
            label: "Propose a phased rollout: soft launch to internal users first, followed by public launch next week.",
            goto: "node-5-phased-consensus",
            hint: "Strategic phased delivery",
            affinity: [
              { characterId: "char-sarah", amount: 15 },
              { characterId: "char-marcus", amount: 15 },
              { characterId: "char-david", amount: 10 }
            ]
          },
          {
            id: "c-collab-reallocate-qa",
            label: "Reallocate two QA engineers to assist David with testing to compress the verification window.",
            goto: "node-6-resource-shift",
            hint: "Operational resource reallocation",
            affinity: [
              { characterId: "char-david", amount: 15 },
              { characterId: "char-marcus", amount: 10 }
            ]
          }
        ]
      },
      "node-3-tech-focus": {
        id: "node-3-tech-focus",
        type: "choice",
        act: 2,
        title: "Navigating Design Concerns",
        body: "David feels supported on security, but Elena is quiet and concerned that user experience is being treated as a secondary thought.",
        speakerId: "char-elena",
        lines: [
          {
            id: "l-tech-1",
            speakerId: "char-elena",
            text: "If we completely drop the onboarding guide, our customer support team will receive dozens of repetitive questions.",
            emotion: "sadness"
          },
          {
            id: "l-tech-2",
            speakerId: "char-sarah",
            text: "Elena raises a valid operational risk. We cannot overload customer support on day one.",
            emotion: "neutral"
          }
        ],
        choices: [
          {
            id: "c-tech-remedy-faq",
            label: "Propose a quick in-app tooltip modal and a knowledge-base article as a lightweight middle ground.",
            goto: "node-7-tooltip-compromise",
            hint: "Creative pragmatic compromise",
            affinity: [
              { characterId: "char-elena", amount: 15 },
              { characterId: "char-sarah", amount: 10 }
            ]
          },
          {
            id: "c-tech-pushback",
            label: "Reiterate that security takes 100% priority and support documentation can be written post-launch.",
            goto: "node-8-strained-relations",
            hint: "Rigid stance",
            affinity: [
              { characterId: "char-elena", amount: -15 },
              { characterId: "char-sarah", amount: -5 }
            ]
          }
        ]
      },
      "node-4-pressure": {
        id: "node-4-pressure",
        type: "choice",
        act: 2,
        title: "Addressing Morale & Rising Tension",
        body: "Both David and Elena push back against mandated overtime, pointing out that fatigue will lead to bugs in production.",
        speakerId: "char-david",
        lines: [
          {
            id: "l-pres-1",
            speakerId: "char-david",
            text: "Rushing security under exhaustion is how data leaks happen. We need a realistic plan, not emergency hours.",
            emotion: "anger"
          },
          {
            id: "l-pres-2",
            speakerId: "char-sarah",
            text: "David is right. As project director, I will not approve an approach that burns out our team.",
            emotion: "neutral"
          }
        ],
        choices: [
          {
            id: "c-pressure-acknowledge-reset",
            label: "Apologize for the initial pressure, step back, and facilitate a realistic scope reduction.",
            goto: "node-2-collaborative",
            hint: "Leadership humility & recovery",
            affinity: [
              { characterId: "char-sarah", amount: 10 },
              { characterId: "char-david", amount: 10 },
              { characterId: "char-elena", amount: 10 }
            ]
          },
          {
            id: "c-pressure-escalate",
            label: "Escalate the issue to executive management to demand additional external contractors.",
            goto: "node-9-management-escalation",
            hint: "Bureaucratic escalation",
            affinity: [
              { characterId: "char-sarah", amount: -10 },
              { characterId: "char-marcus", amount: -10 }
            ]
          }
        ]
      },
      "node-5-phased-consensus": {
        id: "node-5-phased-consensus",
        type: "choice",
        act: 3,
        title: "Finalizing the Phased Release Plan",
        body: "The team is enthusiastic about the phased release. The internal rollout lets David test security with 100 beta users while Elena polishes the interface.",
        speakerId: "char-sarah",
        lines: [
          {
            id: "l-phase-1",
            speakerId: "char-sarah",
            text: "This phased plan protects our quality and keeps stakeholders informed with clear milestone dates.",
            emotion: "triumph"
          },
          {
            id: "l-phase-2",
            speakerId: "char-marcus",
            text: "I will update the dashboard and notify customer success with the revised schedule.",
            emotion: "joy"
          }
        ],
        choices: [
          {
            id: "c-phase-finalize",
            label: "Confirm action items, assign owners, and set a 15-minute daily sync.",
            goto: "ending-success-consensus",
            hint: "Flawless execution",
            affinity: [
              { characterId: "char-sarah", amount: 10 },
              { characterId: "char-david", amount: 10 },
              { characterId: "char-elena", amount: 10 },
              { characterId: "char-marcus", amount: 10 }
            ]
          }
        ]
      },
      "node-6-resource-shift": {
        id: "node-6-resource-shift",
        type: "choice",
        act: 3,
        title: "Coordinating Cross-Functional Support",
        body: "Shifting QA resources speeds up David testing pipeline. Elena agrees to assist with visual regression verification.",
        speakerId: "char-david",
        lines: [
          {
            id: "l-shift-1",
            speakerId: "char-david",
            text: "Having QA test the payment endpoints in parallel saves us a full 48 hours.",
            emotion: "joy"
          },
          {
            id: "l-shift-2",
            speakerId: "char-elena",
            text: "We will meet our deadline with both secure code and great UX.",
            emotion: "triumph"
          }
        ],
        choices: [
          {
            id: "c-shift-conclude",
            label: "Celebrate the team flexibility and lock in the release candidate.",
            goto: "ending-success-consensus",
            hint: "High team rapport outcome",
            affinity: [
              { characterId: "char-david", amount: 10 },
              { characterId: "char-elena", amount: 10 }
            ]
          }
        ]
      },
      "node-7-tooltip-compromise": {
        id: "node-7-tooltip-compromise",
        type: "choice",
        act: 3,
        title: "Deploying the Lightweight Solution",
        body: "Elena designs clean tooltip prompts in two hours, while Marcus coordinates the help center article. The project stays on schedule.",
        speakerId: "char-marcus",
        lines: [
          {
            id: "l-tool-1",
            speakerId: "char-marcus",
            text: "The tooltip solution works smoothly and required zero additional backend adjustments.",
            emotion: "joy"
          }
        ],
        choices: [
          {
            id: "c-tool-finish",
            label: "Wrap up the review and approve the launch readiness checklist.",
            goto: "ending-solid-compromise",
            hint: "Practical balanced result",
            affinity: [
              { characterId: "char-marcus", amount: 10 },
              { characterId: "char-elena", amount: 5 }
            ]
          }
        ]
      },
      "node-8-strained-relations": {
        id: "node-8-strained-relations",
        type: "consequence",
        act: 3,
        title: "Strained Cross-Functional Collaboration",
        body: "The project launched on time with strong backend security, but high initial user confusion caused frustration across support teams and damaged trust between design and engineering.",
        speakerId: "char-sarah",
        lines: [
          {
            id: "l-strain-1",
            speakerId: "char-sarah",
            text: "We delivered on time, but our customer satisfaction scores took a hit. We need a better collaborative process next sprint.",
            emotion: "sadness"
          }
        ],
        next: "ending-growth-opportunity"
      },
      "node-9-management-escalation": {
        id: "node-9-management-escalation",
        type: "consequence",
        act: 3,
        title: "Delayed Review & Executive Interventions",
        body: "Escalating without an internal recommendation created confusion. Executive leadership paused the sprint to review priorities, delaying the launch by two weeks.",
        speakerId: "char-marcus",
        lines: [
          {
            id: "l-esc-1",
            speakerId: "char-marcus",
            text: "Management asked why we did not propose a phased rollout earlier. We will need to regroup and rebuild alignment.",
            emotion: "sadness"
          }
        ],
        next: "ending-growth-opportunity"
      },
      "ending-success-consensus": {
        id: "ending-success-consensus",
        type: "ending",
        act: 3,
        title: "Consensus Achieved: On-Time & High Quality Launch",
        body: "By applying constructive feedback principles and collaborative problem-solving, your team launched a secure, user-friendly product on schedule. Team trust and morale reached an all-time high!",
        theme: "light",
        endingStyle: "success"
      },
      "ending-solid-compromise": {
        id: "ending-solid-compromise",
        type: "ending",
        act: 3,
        title: "Solid Compromise: Pragmatic Delivery",
        body: "You navigated conflicting constraints with practical compromises. The launch succeeded, and the team gained valuable insights for optimizing future workflows.",
        theme: "light",
        endingStyle: "success"
      },
      "ending-growth-opportunity": {
        id: "ending-growth-opportunity",
        type: "ending",
        act: 3,
        title: "Learning Review: Room for Collaborative Growth",
        body: "The project experienced friction due to rigid positions and escalations. While valuable lessons were learned, practicing active listening and the SBI model will yield stronger consensus in future projects.",
        theme: "light",
        endingStyle: "warning"
      }
    }
  }
};
