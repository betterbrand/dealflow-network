# DealFlow Network Design Audit

**Date:** December 24, 2025  
**Auditor:** Art Director Agent  
**Framework:** Linear/Apple aesthetic, Graph-first navigation  

---

## Executive Summary

DealFlow has solid bones—clean layout, consistent spacing, functional UI. But it currently reads as a **generic SaaS tool** rather than a premium intelligence platform. The design is "correct" but not *compelling*.

### Core Issues

| Issue | Impact | Effort |
|-------|--------|--------|
| Flat, shadowless surfaces | High | Low |
| Graph disconnected from navigation | High | Medium |
| No dark mode | High | Medium |
| Generic typography | Medium | Low |
| Missing micro-interactions | Medium | Low |
| Contact detail page lacks hierarchy | High | Medium |
| Modal feels like an afterthought | Medium | Low |

### Priority Recommendations

1. **Implement dark mode** — Immediate premium feel, makes graph pop
2. **Add elevation system** — Shadows and layering create depth
3. **Make graph omnipresent** — Mini-map in sidebar or persistent background
4. **Refine contact detail page** — This is your money view, it needs love
5. **Add command palette (⌘K)** — Linear-style navigation

---

## View-by-View Audit

---

### 1. Dashboard

**Current State:** 4 stat cards, recent contacts list, quick actions. Clean but static.

#### Issues

| Problem | Severity |
|---------|----------|
| Stat cards are flat—no elevation, no hover state | High |
| "Network Graph: View" card is passive, should be interactive | High |
| No insights or intelligence surfaced | High |
| Quick Actions feel like placeholder links | Medium |
| No visual connection to graph | High |

#### Recommendations

**Stat Cards → Make them feel alive**
```jsx
// Before: flat, static
<div className="bg-white rounded-lg border border-gray-200 p-6">

// After: elevated, interactive, gradient accent on hover
<div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 
               p-5 shadow-sm hover:shadow-md transition-all duration-200
               hover:border-orange-300 dark:hover:border-orange-500/50
               cursor-pointer group">
  <div className="flex items-center justify-between">
    <span className="text-sm font-medium text-gray-500 dark:text-gray-400 
                     group-hover:text-orange-600 dark:group-hover:text-orange-400 
                     transition-colors">
      Total Contacts
    </span>
    <Icon className="w-5 h-5 text-gray-400 group-hover:text-orange-500" />
  </div>
  <div className="mt-2">
    <span className="text-3xl font-semibold text-gray-900 dark:text-white">127</span>
    <span className="ml-2 text-sm text-emerald-600">+12 this month</span>
  </div>
</div>
```

**Add Graph Mini-Map**
Replace the passive "Network Graph: View" card with an interactive mini-graph:
```
┌─────────────────────────────────┐
│  Network Graph                  │
│  ┌─────────────────────────┐   │
│  │    ●──●    ●            │   │  ← Actual mini force graph
│  │   ●  │   / \            │   │     Clickable, zoomable
│  │    ● ●──●   ●           │   │     Shows your network shape
│  │     \│/                 │   │
│  │      [YOU]              │   │
│  └─────────────────────────┘   │
│  Click to explore →            │
└─────────────────────────────────┘
```

**Add Insights Section**
```
┌─ Network Insights ──────────────────────────────────┐
│                                                      │
│  🔥 3 warm intro opportunities                       │  ← Orange accent
│     People you know who know your targets            │
│                                                      │
│  ⏰ 8 contacts going cold                            │  ← Amber warning
│     No interaction in 90+ days                       │
│                                                      │
│  📈 Network grew 23% this quarter                    │  ← Green positive
│     Mostly from Web Summit connections               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

### 2. Contacts List

**Current State:** Functional table with search, avatars, columns. Modal for quick add.

#### Issues

| Problem | Severity |
|---------|----------|
| Table rows have no hover state or visual feedback | Medium |
| No connection to graph—feels like a spreadsheet | High |
| "View" action is low-contrast, easy to miss | Low |
| Empty columns (dashes) create visual noise | Medium |
| No bulk selection or actions | Medium |

#### Recommendations

**Table Rows → Add life**
```jsx
// Row styling
<tr className="border-b border-gray-100 dark:border-gray-800
              hover:bg-gray-50 dark:hover:bg-gray-800/50
              transition-colors duration-150 cursor-pointer
              group">
  
  {/* Add node indicator before avatar */}
  <td className="py-3 px-4 flex items-center gap-3">
    <div className="w-2 h-2 rounded-full bg-pink-400" /> {/* Person node color */}
    <Avatar />
    <span className="font-medium text-gray-900 dark:text-white 
                     group-hover:text-orange-600 dark:group-hover:text-orange-400
                     transition-colors">
      {name}
    </span>
  </td>
  
  {/* Make "View" more visible on hover */}
  <td className="py-3 px-4">
    <button className="opacity-0 group-hover:opacity-100 
                       text-sm font-medium text-orange-600 hover:text-orange-700
                       transition-opacity duration-150">
      View →
    </button>
  </td>
</tr>
```

**Empty State Treatment**
```jsx
// Instead of "-" for empty fields
<span className="text-gray-300 dark:text-gray-600 text-sm">—</span>

// Or better: show add prompt on hover
<span className="text-gray-300 group-hover:hidden">—</span>
<button className="hidden group-hover:inline text-orange-500 text-sm">
  + Add
</button>
```

**Graph Integration**
- Add a collapsible right panel or mini-map showing selected contact's position in network
- On row hover, if mini-map visible, highlight that node

---

### 3. Quick Add Contact Modal

**Current State:** Functional modal with basic form fields. Gets the job done.

#### Issues

| Problem | Severity |
|---------|----------|
| Modal feels generic—no brand presence | Medium |
| Input styling is inconsistent (blue focus ring doesn't match orange brand) | Medium |
| No visual hierarchy in the form | Medium |
| "Opportunity" field buried at bottom—this is your differentiator! | High |
| Cancel/Create buttons have weak visual weight | Low |

#### Recommendations

**Modal Styling → Premium feel**
```jsx
// Modal container
<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
  
  {/* Modal */}
  <div className="relative bg-white dark:bg-gray-900 rounded-2xl 
                  shadow-2xl border border-gray-200 dark:border-gray-800
                  w-full max-w-md overflow-hidden">
    
    {/* Header with subtle gradient */}
    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800
                    bg-gradient-to-r from-gray-50 to-white 
                    dark:from-gray-800/50 dark:to-gray-900">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        Quick Add Contact
      </h2>
      <p className="text-sm text-gray-500 mt-0.5">
        Capture the essentials now. Add more details later.
      </p>
    </div>
    
    {/* Form content */}
    <div className="px-6 py-5 space-y-4">
      {/* ... form fields ... */}
    </div>
    
    {/* Footer */}
    <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800
                    bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
      <button className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300
                         hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition">
        Cancel
      </button>
      <button className="px-4 py-2 text-sm font-medium text-white
                         bg-gradient-to-r from-orange-500 to-orange-600
                         hover:from-orange-600 hover:to-orange-700
                         rounded-lg shadow-sm hover:shadow transition-all">
        Create Contact
      </button>
    </div>
  </div>
</div>
```

**Promote "Opportunity" Field**
This is DealFlow's differentiator—why this contact matters. Make it prominent:
```jsx
{/* Move Opportunity to top, make it visually distinct */}
<div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 
                border border-orange-200 dark:border-orange-800/50">
  <label className="flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-400">
    <LightbulbIcon className="w-4 h-4" />
    Why does this contact matter?
  </label>
  <textarea 
    placeholder="e.g., 'Potential partnership for API product'"
    className="mt-2 w-full bg-white dark:bg-gray-900 border-0 rounded-lg
               text-sm placeholder:text-orange-300 dark:placeholder:text-orange-700
               focus:ring-2 focus:ring-orange-500/50"
  />
</div>
```

**Fix Focus Ring Color**
```jsx
// Before: blue focus ring (default)
<input className="focus:ring-blue-500" />

// After: orange to match brand
<input className="focus:outline-none focus:ring-2 focus:ring-orange-500/50 
                  focus:border-orange-500" />
```

---

### 4. Contact Detail Page (Satya Nadella)

**Current State:** Shows imported LinkedIn data with opportunity banner, embedded profile, sidebar details. This is your most important view—and it's the weakest.

#### Issues

| Problem | Severity |
|---------|----------|
| Opportunity banner feels like an error state (yellow warning) | High |
| LinkedIn embed dominates—your UI should interpret data, not just show it | High |
| No visual hierarchy—everything has equal weight | High |
| "View in Graph" is buried in sidebar—should be prominent | High |
| Details sidebar is sparse and static | Medium |
| No relationship context (who else knows this person?) | High |
| Back button and actions compete for attention | Medium |

#### Recommendations

**Restructure the Layout**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ ← Back                                    [Re-import] [+ Relationship]  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─ Hero Section ─────────────────────────────────────────────────────┐│
│  │                                                                     ││
│  │  [Avatar]  Satya Nadella                              [View in     ││
│  │            Chairman and CEO at Microsoft               Graph ◉]    ││
│  │            📍 Redmond, Washington                                  ││
│  │                                                                     ││
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐                     ││
│  │  │ 11M        │ │ 500        │ │ 3          │  ← Key metrics      ││
│  │  │ followers  │ │ connections│ │ mutual     │                      ││
│  │  └────────────┘ └────────────┘ └────────────┘                     ││
│  │                                                                     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌─ Opportunity (your note) ───────────────────────────────────────────┐│
│  │  💡 Potential partnership for cloud infrastructure                  ││
│  │     Added 12/23/2025                                    [Edit]     ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                         │
│  ┌─ Network Context ──────────────────┐ ┌─ About ────────────────────┐ │
│  │                                     │ │                            │ │
│  │  Connections in your network:       │ │ As chairman and CEO of     │ │
│  │  • Andrew Ng (works_with)           │ │ Microsoft, I define my     │ │
│  │  • You (added 12/23)                │ │ mission...                 │ │
│  │                                     │ │                            │ │
│  │  [See relationship paths]           │ │                            │ │
│  └─────────────────────────────────────┘ └────────────────────────────┘ │
│                                                                         │
│  ┌─ Experience ────────────────────────────────────────────────────────┐│
│  │  ...                                                                ││
│  └─────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────┘
```

**Hero Section Styling**
```jsx
<div className="relative bg-gradient-to-br from-gray-50 to-white 
                dark:from-gray-800 dark:to-gray-900
                rounded-2xl border border-gray-200 dark:border-gray-800 
                p-6 shadow-sm">
  
  <div className="flex items-start justify-between">
    <div className="flex items-center gap-5">
      {/* Large avatar with ring */}
      <div className="relative">
        <img src={avatar} className="w-20 h-20 rounded-2xl object-cover" />
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full 
                        bg-emerald-500 border-2 border-white dark:border-gray-900
                        flex items-center justify-center">
          <CheckIcon className="w-3 h-3 text-white" />
        </div>
      </div>
      
      {/* Name and title */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Satya Nadella
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-0.5">
          Chairman and CEO at Microsoft
        </p>
        <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
          <MapPinIcon className="w-4 h-4" />
          Redmond, Washington
        </div>
      </div>
    </div>
    
    {/* Prominent "View in Graph" */}
    <button className="flex items-center gap-2 px-4 py-2 
                       bg-gray-900 dark:bg-white text-white dark:text-gray-900
                       rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100
                       transition-colors">
      <GraphIcon className="w-4 h-4" />
      View in Graph
    </button>
  </div>
  
  {/* Metrics row */}
  <div className="flex gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
    <div className="text-center">
      <div className="text-xl font-semibold text-gray-900 dark:text-white">11M</div>
      <div className="text-xs text-gray-500">followers</div>
    </div>
    <div className="text-center">
      <div className="text-xl font-semibold text-gray-900 dark:text-white">500</div>
      <div className="text-xs text-gray-500">connections</div>
    </div>
    <div className="text-center">
      <div className="text-xl font-semibold text-orange-600 dark:text-orange-400">3</div>
      <div className="text-xs text-gray-500">in your network</div>
    </div>
  </div>
</div>
```

**Opportunity Banner → Elevated, not warning**
```jsx
// Before: Yellow warning banner
<div className="bg-yellow-50 border border-yellow-200">

// After: Prominent but positive
<div className="bg-gradient-to-r from-orange-50 to-amber-50 
                dark:from-orange-900/20 dark:to-amber-900/20
                rounded-xl border border-orange-200 dark:border-orange-800/50 
                p-4 flex items-start justify-between">
  <div className="flex items-start gap-3">
    <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-800/50 
                    flex items-center justify-center">
      <LightbulbIcon className="w-4 h-4 text-orange-600 dark:text-orange-400" />
    </div>
    <div>
      <div className="text-sm font-medium text-orange-800 dark:text-orange-300">
        Your Opportunity Note
      </div>
      <p className="text-orange-700 dark:text-orange-400 mt-0.5">
        Potential partnership for cloud infrastructure
      </p>
      <a href="#" className="text-xs text-orange-600 hover:underline mt-1 inline-block">
        https://www.linkedin.com/in/satyanadella/
      </a>
    </div>
  </div>
  <button className="text-orange-600 hover:text-orange-700 p-1">
    <PencilIcon className="w-4 h-4" />
  </button>
</div>
```

**Add Network Context Section**
This is the killer feature—show how this contact fits in their network:
```jsx
<div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 
                dark:border-gray-800 p-5">
  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
    Network Context
  </h3>
  
  <div className="mt-4 space-y-3">
    {/* Mutual connections */}
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/30 
                      flex items-center justify-center">
        <UserIcon className="w-4 h-4 text-pink-600" />
      </div>
      <div>
        <span className="font-medium text-gray-900 dark:text-white">Andrew Ng</span>
        <span className="text-gray-500 ml-2 text-sm">works_with</span>
      </div>
    </div>
    
    {/* Path to you */}
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 
                      flex items-center justify-center">
        <UserIcon className="w-4 h-4 text-orange-600" />
      </div>
      <div>
        <span className="font-medium text-gray-900 dark:text-white">You</span>
        <span className="text-gray-500 ml-2 text-sm">added 12/23/2025</span>
      </div>
    </div>
  </div>
  
  <button className="mt-4 text-sm text-orange-600 hover:text-orange-700 font-medium">
    See all relationship paths →
  </button>
</div>
```

**Remove LinkedIn Embed Dominance**
The embedded LinkedIn banner takes up too much real estate and makes DealFlow feel like a wrapper, not a product. Instead:
- Extract and display the data natively (you already have name, title, location, about)
- Show LinkedIn link as a small button/chip, not an embed
- Reserve the space for YOUR value-add: network context, opportunity tracking, relationship paths

---

### 5. Knowledge Graph

**Current State:** Force-directed graph with colored nodes, edge labels. Functional but basic.

#### Issues

| Problem | Severity |
|---------|----------|
| Graph floats in white void—no grounding | Medium |
| Nodes are plain circles—no depth or polish | Medium |
| Edge labels ("works_with") clutter the view | Low |
| No visible controls (zoom, layout, filter) | High |
| Disconnected from rest of app | High |

#### Recommendations

**Graph Container Styling**
```jsx
<div className="relative h-full bg-gray-50 dark:bg-[#0A0A0B] rounded-xl 
                border border-gray-200 dark:border-gray-800 overflow-hidden">
  
  {/* Subtle grid pattern background */}
  <div className="absolute inset-0 opacity-30"
       style={{
         backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
         backgroundSize: '24px 24px'
       }} />
  
  {/* Graph canvas */}
  <div className="relative z-10" ref={graphRef} />
  
  {/* Controls overlay */}
  <div className="absolute bottom-4 left-4 flex gap-2">
    <button className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md 
                       border border-gray-200 dark:border-gray-700
                       hover:bg-gray-50 dark:hover:bg-gray-700 transition">
      <MinusIcon className="w-4 h-4" />
    </button>
    <button className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md 
                       border border-gray-200 dark:border-gray-700">
      <PlusIcon className="w-4 h-4" />
    </button>
    <button className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-md 
                       border border-gray-200 dark:border-gray-700">
      <MaximizeIcon className="w-4 h-4" />
    </button>
  </div>
  
  {/* Filter chips */}
  <div className="absolute top-4 left-4 flex gap-2">
    <button className="px-3 py-1.5 text-sm font-medium rounded-full
                       bg-gray-900 dark:bg-white text-white dark:text-gray-900">
      All
    </button>
    <button className="px-3 py-1.5 text-sm font-medium rounded-full
                       bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                       border border-gray-200 dark:border-gray-700">
      People
    </button>
    <button className="px-3 py-1.5 text-sm font-medium rounded-full
                       bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300
                       border border-gray-200 dark:border-gray-700">
      Companies
    </button>
  </div>
</div>
```

**Node Styling (depends on graph library)**
```javascript
// If using D3 or similar
const nodeStyle = {
  // Add subtle gradient
  fill: `url(#gradient-${nodeType})`,
  
  // Add shadow via filter
  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
  
  // Hover state
  onHover: {
    transform: 'scale(1.08)',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
  },
  
  // Selected state
  onSelect: {
    stroke: '#F97316',
    strokeWidth: 3,
    filter: 'drop-shadow(0 0 12px rgba(249,115,22,0.4))',
  }
};
```

**Edge Labels → Show on hover only**
```javascript
// Default: edges are subtle lines
edge.style = {
  stroke: 'rgba(156, 163, 175, 0.3)', // gray-400/30
  strokeWidth: 1,
};

// On hover: show label, highlight edge
edge.onHover = {
  stroke: 'rgba(249, 115, 22, 0.6)',
  strokeWidth: 2,
  label: { visible: true, text: relationship }
};
```

---

### 6. AI Query

**Current State:** Clean input with example chips. Results area empty in screenshot.

#### Issues

| Problem | Severity |
|---------|----------|
| Feels empty—large blank space below input | Medium |
| Example chips are helpful but lack visual hierarchy | Low |
| No indication of what kinds of answers to expect | Medium |
| "History" button is there but feels disconnected | Low |

#### Recommendations

**Add Visual Context When Empty**
```jsx
{!hasQuery && (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100
                    dark:from-orange-900/30 dark:to-amber-900/30
                    flex items-center justify-center mb-4">
      <SparklesIcon className="w-8 h-8 text-orange-500" />
    </div>
    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
      Ask anything about your network
    </h3>
    <p className="text-gray-500 mt-1 max-w-md">
      Find connections, discover paths, surface opportunities. 
      Results will highlight directly in your graph.
    </p>
    
    {/* Example queries with better visual treatment */}
    <div className="mt-8 grid grid-cols-2 gap-3 max-w-lg">
      {examples.map(ex => (
        <button key={ex} 
                className="text-left p-3 rounded-xl bg-gray-50 dark:bg-gray-800
                           border border-gray-200 dark:border-gray-700
                           hover:border-orange-300 dark:hover:border-orange-600
                           hover:bg-orange-50 dark:hover:bg-orange-900/20
                           transition-all duration-200 text-sm text-gray-700 
                           dark:text-gray-300">
          {ex}
        </button>
      ))}
    </div>
  </div>
)}
```

**Result Display → Visual, not just text**
When results come back, show them with graph integration:
```jsx
<div className="space-y-4">
  <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 
                  dark:border-gray-800 shadow-sm">
    <p className="text-gray-900 dark:text-white">
      Found <span className="font-semibold text-orange-600">3 paths</span> to OpenAI:
    </p>
    
    {/* Path visualization */}
    <div className="mt-4 space-y-3">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50 
                      dark:bg-gray-800 hover:bg-orange-50 dark:hover:bg-orange-900/20
                      cursor-pointer transition-colors">
        <span className="w-2 h-2 rounded-full bg-pink-400" />
        <span>Andrew Ng</span>
        <span className="text-gray-400">→</span>
        <span>Ilya Sutskever</span>
        <span className="ml-auto text-xs text-emerald-600 font-medium">High confidence</span>
      </div>
      {/* ... more paths ... */}
    </div>
    
    <button className="mt-4 w-full py-2 text-sm font-medium text-orange-600 
                       hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition">
      Show in Graph →
    </button>
  </div>
</div>
```

---

### 7. Suggestions

**Current State:** Single suggestion card showing two contacts with shared attribute.

#### Issues

| Problem | Severity |
|---------|----------|
| Only shows one suggestion—feels empty | High |
| "Medium Confidence" badge is vague | Medium |
| Reasoning ("both in Palo Alto") is buried | High |
| Actions (Dismiss/Add) feel like afterthoughts | Medium |

#### Recommendations

**Show Multiple Suggestions in Stack**
```jsx
<div className="space-y-4">
  {suggestions.map((s, i) => (
    <div key={i} className={`
      p-5 rounded-xl border transition-all duration-200
      ${i === 0 
        ? 'bg-white dark:bg-gray-900 border-orange-200 dark:border-orange-800/50 shadow-md' 
        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }
    `}>
      {/* Lead with the reasoning */}
      <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400 
                      font-medium mb-3">
        <MapPinIcon className="w-4 h-4" />
        Both based in Palo Alto
      </div>
      
      {/* The two people */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar person={s.person1} />
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{s.person1.name}</div>
            <div className="text-sm text-gray-500">{s.person1.title}</div>
          </div>
        </div>
        
        <div className="text-gray-300 dark:text-gray-600">
          <LinkIcon className="w-5 h-5" />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="font-medium text-gray-900 dark:text-white">{s.person2.name}</div>
            <div className="text-sm text-gray-500">{s.person2.title}</div>
          </div>
          <Avatar person={s.person2} />
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex items-center justify-between mt-4 pt-4 
                      border-t border-gray-100 dark:border-gray-700">
        <button className="text-sm text-gray-500 hover:text-gray-700 
                           dark:hover:text-gray-300 transition">
          Dismiss
        </button>
        <button className="px-4 py-2 text-sm font-medium text-white
                           bg-gradient-to-r from-orange-500 to-orange-600
                           hover:from-orange-600 hover:to-orange-700
                           rounded-lg shadow-sm transition-all">
          Add Relationship
        </button>
      </div>
    </div>
  ))}
</div>
```

---

### 8. Companies List

**Current State:** Basic table with search. Very sparse data shown.

#### Same issues as Contacts list, plus:

| Problem | Severity |
|---------|----------|
| "0" contacts for Microsoft seems wrong—you have Satya | High (data bug?) |
| No company logos or visual identity | Medium |
| Industry/Location columns often empty | Medium |

#### Recommendations

- Add company logo (fetch from Clearbit or similar)
- Show contact avatars inline (people you know at this company)
- Click company → see subgraph of all connections at that company

---

### 9. User Management / Admin

**Current State:** Clean functional admin page.

#### Issues

| Problem | Severity |
|---------|----------|
| Consistent with rest of app (flat) | Low |
| "Important Notes" feels like an afterthought | Low |

#### Recommendations

Low priority—admin pages can be purely functional. But consider:
- Add avatars to user list
- Elevate the card slightly (`shadow-sm`)
- Move "Important Notes" to a tooltip or collapsible

---

## Global Recommendations

### 1. Implement Dark Mode

This is the single highest-impact change. Your graph and data will pop dramatically on dark.

```jsx
// tailwind.config.js
module.exports = {
  darkMode: 'class', // or 'media' for system preference
  // ...
}

// Add to root element
<html className="dark">
```

### 2. Add Command Palette

⌘K to open. This is your power-user unlock.

```
Features:
- Navigate: "go to contacts", "open graph"
- Search: "find Satya", "companies in SF"
- Actions: "add contact", "import from LinkedIn"
- AI: "who should I reconnect with?"
```

Use cmdk, kbar, or build custom.

### 3. Persistent Graph Mini-Map

Add to sidebar or as a floating element. Shows network shape, highlights current selection.

### 4. Consistent Elevation System

Define and apply:
```
Level 0: bg-white border-0 shadow-none (base)
Level 1: bg-white border shadow-sm (cards)
Level 2: bg-white border shadow-md (elevated cards, popovers)
Level 3: bg-white border shadow-lg (dropdowns, modals)
Level 4: bg-white border shadow-xl (command palette, full modals)
```

### 5. Focus States

Every interactive element needs a visible focus state:
```jsx
focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2
```

---

## Implementation Priority

### Phase 1: Quick Wins (1-2 days)
- [ ] Add shadows and elevation to cards
- [ ] Fix button gradients and hover states
- [ ] Update focus rings to orange
- [ ] Style modal properly
- [ ] Add hover states to table rows

### Phase 2: Dark Mode (2-3 days)
- [ ] Set up dark mode infrastructure
- [ ] Create dark color tokens
- [ ] Update all components
- [ ] Test graph colors on dark background

### Phase 3: Contact Detail Redesign (2-3 days)
- [ ] Restructure layout (hero, opportunity, network context)
- [ ] Remove LinkedIn embed dominance
- [ ] Add "View in Graph" prominently
- [ ] Add network context section

### Phase 4: Graph Integration (3-5 days)
- [ ] Add graph mini-map to sidebar
- [ ] Node/row hover highlighting across views
- [ ] Graph controls (zoom, filter, layout)
- [ ] Node styling polish

### Phase 5: Command Palette (2-3 days)
- [ ] Install cmdk or kbar
- [ ] Implement navigation commands
- [ ] Add search integration
- [ ] Style to match premium aesthetic

---

## Measuring Success

After implementing, validate:

1. **Visual Distinction**: Show someone DealFlow and 3 competitor screenshots. Can they identify yours instantly?
2. **Time-to-Insight**: How fast can a user find "who do I know at Microsoft"?
3. **Delight**: Do users *want* to explore their network, or just check-and-leave?
4. **Graph Centrality**: In user testing, do people understand the graph is THE interface, not a feature?

---

## Appendix: Component Snippets

[See art-director.md for full component code patterns]
