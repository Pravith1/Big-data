# Distributed Database Schema Design: MongoDB & Neo4j

This document specifies the distributed database architecture for the **Smart Sports Analytics Platform**, which implements a polyglot persistence pattern combining:
1. **MongoDB (Document Store)**: High-density attributes, logs, nested contacts, metrics, and profiles.
2. **Neo4j (Graph Database)**: Highly connected domain relationships (club memberships, coaching networks, tournament participation, and sports facilities).
3. **XML Global Schema (`globalSchema.xml`)**: The declarative single source of truth that defines document structures, data types, validation rules, graph properties, and cross-database keys.

---

## 1. High-Level Architecture & Polyglot Model

```mermaid
graph TD
    subgraph Metadata Layer
        XML["globalSchema.xml (Single Source of Truth)"]
        Parser["xmlSchemaService.js (Parser & Validator)"]
        XML --> Parser
    end

    subgraph Document Layer: MongoDB
        P_Doc["players"]
        TS_Doc["training_sessions"]
        MR_Doc["medical_records"]
        T_Doc["tournaments"]
        PR_Doc["performance_records"]
    end

    subgraph Graph Layer: Neo4j
        Node_Player["(:Player)"]
        Node_Coach["(:Coach)"]
        Node_Team["(:Team)"]
        Node_Sport["(:Sport)"]
        Node_TC["(:TrainingCenter)"]
        Node_Tourn["(:Tournament)"]

        Node_Coach -->|COACHES| Node_Team
        Node_Player -->|MEMBER_OF| Node_Team
        Node_Player -->|COACHED_BY| Node_Coach
        Node_Player -->|PLAYS| Node_Sport
        Node_Player -->|TRAINS_AT| Node_TC
        Node_Team -->|PARTICIPATES_IN| Node_Tourn
        Node_Player -->|PARTICIPATES_IN| Node_Tourn
        Node_Tourn -->|HELD_AT| Node_TC
    end

    Parser -->|Validates & Builds Docs| Document Layer
    Parser -->|Builds Nodes & Rels| Graph Layer
```

---

## 2. MongoDB Document Schema Specifications

### 2.1 Collection: `players`
- **Purpose**: Stores complete athlete profile data, contact details, contract dates, and bio.
- **Primary Key**: `_id` (`String`, e.g. `"P101"`)

| Field | Type | Required | Default | Allowed Values | Description |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `_id` | `String` | Yes | — | — | Unique Player ID |
| `name` | `String` | Yes | — | — | Athlete full name |
| `age` | `Number` | No | `20` | — | Age in years |
| `gender` | `String` | No | `"Male"` | `Male, Female, Other` | Gender identity |
| `sport` | `String` | No | `"Football"` | — | Primary sport discipline |
| `position` | `String` | No | `"Player"` | — | Field position / role |
| `trainingCenterId` | `String` | No | `null` | — | Facility ID (`TC01`, etc.) |
| `contact.email` | `String` | No | `""` | — | Contact email |
| `contact.phone` | `String` | No | `""` | — | Contact phone number |
| `joinedDate` | `Date/String` | No | `CURRENT_DATE`| — | Registration date (`YYYY-MM-DD`) |

**Sample Document:**
```json
{
  "_id": "P101",
  "name": "Pravith",
  "age": 20,
  "gender": "Male",
  "sport": "Football",
  "position": "Midfielder",
  "trainingCenterId": "TC01",
  "contact": {
    "email": "pravith@example.com",
    "phone": "9876543210"
  },
  "joinedDate": "2025-06-10"
}
```

---

### 2.2 Collection: `training_sessions`
- **Purpose**: Stores telemetry metrics, biometric heart rate data, and coach evaluation notes.
- **Primary Key**: `_id` (`String`, e.g. `"TS1001"`)
- **Foreign Key**: `playerId` (`String` -> references `players._id`)

| Field | Type | Required | Default | Description |
| :--- | :---: | :---: | :---: | :--- |
| `_id` | `String` | Yes | — | Unique Session ID |
| `playerId` | `String` | Yes | — | Reference to Player document |
| `date` | `Date/String` | No | `CURRENT_DATE` | Date of training workout |
| `durationMinutes` | `Number` | No | `60` | Duration in minutes |
| `metrics.distanceKm` | `Number` | No | `0` | Distance covered in kilometers |
| `metrics.steps` | `Number` | No | `0` | Step count |
| `metrics.calories` | `Number` | No | `0` | Calories burned (kcal) |
| `metrics.averageHeartRate` | `Number` | No | `120` | Mean heart rate (bpm) |
| `metrics.maximumHeartRate` | `Number` | No | `160` | Peak heart rate (bpm) |
| `fitnessScore` | `Number` | No | `7.5` | Standardized fitness index (1.0 to 10.0) |
| `coachFeedback` | `String` | No | `""` | Qualitative coach assessment |

**Sample Document:**
```json
{
  "_id": "TS1001",
  "playerId": "P101",
  "date": "2026-10-01",
  "durationMinutes": 120,
  "metrics": {
    "distanceKm": 8.7,
    "steps": 12450,
    "calories": 820,
    "averageHeartRate": 142,
    "maximumHeartRate": 178
  },
  "fitnessScore": 8.4,
  "coachFeedback": "Good stamina and movement."
}
```

---

### 2.3 Collection: `tournaments`
- **Purpose**: Competitive tournament events, schedules, locations, and stages.
- **Primary Key**: `_id` (`String`, e.g. `"T501"`)

| Field | Type | Required | Default | Allowed Values | Description |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `_id` | `String` | Yes | — | — | Unique Tournament ID |
| `name` | `String` | Yes | — | — | Official competition name |
| `sport` | `String` | No | `"Football"` | — | Sport discipline |
| `location` | `String` | No | `"Stadium"` | — | Host city / stadium |
| `startDate` | `Date/String` | No | `CURRENT_DATE` | — | Opening date |
| `endDate` | `Date/String` | No | `CURRENT_DATE` | — | Final/Closing date |
| `status` | `String` | No | `"Upcoming"` | `Upcoming, Ongoing, Completed` | Event status |

**Sample Document:**
```json
{
  "_id": "T501",
  "name": "National Football Championship",
  "sport": "Football",
  "location": "Delhi",
  "startDate": "2026-11-01",
  "endDate": "2026-11-10",
  "status": "Upcoming"
}
```

---

### 2.4 Collection: `medical_records`
- **Primary Key**: `_id` (`String`, e.g. `"MR501"`)
- **Foreign Key**: `playerId` (`String` -> references `players._id`)

| Field | Type | Description |
| :--- | :---: | :--- |
| `_id` | `String` | Unique Medical Record ID |
| `playerId` | `String` | Foreign key referencing Player ID |
| `injury.type` | `String` | Diagnosis (e.g. "Hamstring Strain") |
| `injury.severity` | `String` | `Mild`, `Moderate`, `Severe` |
| `injury.date` | `Date/String` | Date injury occurred |
| `treatment` | `String` | Medical intervention (e.g. "Physiotherapy") |
| `recoveryStatus` | `String` | `Fit`, `Recovering`, `Injured` |
| `fitnessAssessment.score` | `Number` | Clearance score (0-100) |
| `fitnessAssessment.date` | `Date/String` | Medical clearance date |

---

### 2.5 Collection: `performance_records`
- **Primary Key**: `_id` (`String`, e.g. `"PR1001"`)
- **Foreign Keys**: `playerId` (references `players._id`), `tournamentId` (references `tournaments._id`)

| Field | Type | Description |
| :--- | :---: | :--- |
| `_id` | `String` | Record ID |
| `playerId` | `String` | Athlete reference |
| `tournamentId` | `String` | Tournament reference |
| `matchesPlayed` | `Number` | Match appearances |
| `goals` | `Number` | Goals scored |
| `assists` | `Number` | Assists registered |
| `rating` | `Number` | Competition rating (e.g. 8.2) |

---

## 3. Neo4j Graph Schema Specifications

### 3.1 Node Labels & Properties

| Node Label | Key Property | Properties | Description |
| :--- | :---: | :--- | :--- |
| `:Player` | `id` (`String`) | `id`, `name`, `sport`, `age` | Graph representation of athlete |
| `:Coach` | `id` (`String`) | `id`, `name` | Coaching staff member |
| `:Team` | `id` (`String`) | `id`, `name` | Sports franchise / club squad |
| `:Sport` | `id` (`String`) | `id`, `name` | Sport discipline |
| `:TrainingCenter`| `id` (`String`) | `id`, `name`, `city` | Physical athletic training facility |
| `:Tournament` | `id` (`String`) | `id`, `name` | Competition event node |

---

### 3.2 Relationships & Semantics

```
(Coach) -[:COACHES]-> (Team)
(Player) -[:MEMBER_OF]-> (Team)
(Player) -[:COACHED_BY]-> (Coach)
(Player) -[:PLAYS]-> (Sport)
(Player) -[:TRAINS_AT]-> (TrainingCenter)
(Team) -[:PARTICIPATES_IN]-> (Tournament)
(Player) -[:PARTICIPATES_IN]-> (Tournament)
(Tournament) -[:HELD_AT]-> (TrainingCenter)
```

| Relationship | Start Node | End Node | Multiplicity | Description |
| :--- | :---: | :---: | :---: | :--- |
| `COACHES` | `:Coach` | `:Team` | `1 : N` | Coach manages club team |
| `MEMBER_OF` | `:Player` | `:Team` | `N : 1` | Athlete is squad member of team |
| `COACHED_BY` | `:Player` | `:Coach` | `N : 1` | Athlete trains under coach directly |
| `PLAYS` | `:Player` | `:Sport` | `N : 1` | Athlete primary sport |
| `TRAINS_AT` | `:Player` | `:TrainingCenter` | `N : 1` | Athlete training headquarters |
| `PARTICIPATES_IN` | `:Team` | `:Tournament` | `N : M` | Team entered in championship |
| `PARTICIPATES_IN` | `:Player` | `:Tournament` | `N : M` | Athlete registered for tournament |
| `HELD_AT` | `:Tournament` | `:TrainingCenter` | `N : 1` | Host facility for tournament |

---

## 4. XML Global Schema Mapping Matrix

The `backend/schema/globalSchema.xml` connects the two database paradigms:

| XML Element | Database Target | Logical Role | Primary / Key Property |
| :--- | :---: | :--- | :--- |
| `<entity name="Player">` | MongoDB | `players` collection document | `_id` |
| `<graphEntity name="Player">` | Neo4j | `(:Player)` node | `id` |
| `<entity name="TrainingSession">` | MongoDB | `training_sessions` collection | `_id` (FK: `playerId`) |
| `<graphEntity name="Coach">` | Neo4j | `(:Coach)` node | `id` |
| `<graphEntity name="Team">` | Neo4j | `(:Team)` node | `id` |
| `<relationship name="COACHES">` | Neo4j | `(:Coach)-[:COACHES]->(:Team)` | — |
| `<relationship name="MEMBER_OF">` | Neo4j | `(:Player)-[:MEMBER_OF]->(:Team)` | — |
| `<relationship name="COACHED_BY">` | Neo4j | `(:Player)-[:COACHED_BY]->(:Coach)`| — |
