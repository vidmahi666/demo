import { useState, useRef, useEffect } from "react";

const TABLES = {
  User:             { color: "#2563EB", light: "#EFF6FF", fields: [{ name: "UserID", pk: true }, { name: "Name" }, { name: "Role" }, { name: "Email" }, { name: "Phone" }, { name: "Status" }] },
  AuditLog:         { color: "#2563EB", light: "#EFF6FF", fields: [{ name: "AuditID", pk: true }, { name: "UserID", fk: "User" }, { name: "Action" }, { name: "Resource" }, { name: "Timestamp" }] },
  Student:          { color: "#059669", light: "#ECFDF5", fields: [{ name: "StudentID", pk: true }, { name: "Name" }, { name: "DOB" }, { name: "Gender" }, { name: "Address" }, { name: "ContactInfo" }, { name: "Status" }] },
  StudentDocument:  { color: "#059669", light: "#ECFDF5", fields: [{ name: "DocumentID", pk: true }, { name: "StudentID", fk: "Student" }, { name: "DocType" }, { name: "FileURI" }, { name: "UploadedDate" }, { name: "VerificationStatus" }] },
  Course:           { color: "#7C3AED", light: "#F5F3FF", fields: [{ name: "CourseID", pk: true }, { name: "Title" }, { name: "Description" }, { name: "TeacherID", fk: "User" }, { name: "StartDate" }, { name: "EndDate" }, { name: "Status" }] },
  Curriculum:       { color: "#7C3AED", light: "#F5F3FF", fields: [{ name: "CurriculumID", pk: true }, { name: "CourseID", fk: "Course" }, { name: "TopicsJSON" }, { name: "Status" }] },
  Enrollment:       { color: "#7C3AED", light: "#F5F3FF", fields: [{ name: "EnrollmentID", pk: true }, { name: "StudentID", fk: "Student" }, { name: "CourseID", fk: "Course" }, { name: "Date" }, { name: "Status" }] },
  Content:          { color: "#D97706", light: "#FFFBEB", fields: [{ name: "ContentID", pk: true }, { name: "CourseID", fk: "Course" }, { name: "Title" }, { name: "Type" }, { name: "FileURI" }, { name: "UploadedDate" }, { name: "Status" }] },
  ContentAccess:    { color: "#D97706", light: "#FFFBEB", fields: [{ name: "AccessID", pk: true }, { name: "StudentID", fk: "Student" }, { name: "ContentID", fk: "Content" }, { name: "Date" }, { name: "Status" }] },
  Assessment:       { color: "#DC2626", light: "#FEF2F2", fields: [{ name: "AssessmentID", pk: true }, { name: "CourseID", fk: "Course" }, { name: "Title" }, { name: "Type" }, { name: "Date" }, { name: "Status" }] },
  Submission:       { color: "#DC2626", light: "#FEF2F2", fields: [{ name: "SubmissionID", pk: true }, { name: "AssessmentID", fk: "Assessment" }, { name: "StudentID", fk: "Student" }, { name: "FileURI" }, { name: "Date" }, { name: "Status" }] },
  Progress:         { color: "#DC2626", light: "#FEF2F2", fields: [{ name: "ProgressID", pk: true }, { name: "StudentID", fk: "Student" }, { name: "CourseID", fk: "Course" }, { name: "MetricsJSON" }, { name: "Date" }, { name: "Status" }] },
  ComplianceRecord: { color: "#0891B2", light: "#ECFEFF", fields: [{ name: "ComplianceID", pk: true }, { name: "EntityID", fk: "User" }, { name: "Type" }, { name: "Result" }, { name: "Date" }, { name: "Notes" }] },
  Audit:            { color: "#0891B2", light: "#ECFEFF", fields: [{ name: "AuditID", pk: true }, { name: "OfficerID", fk: "User" }, { name: "Scope" }, { name: "Findings" }, { name: "Date" }, { name: "Status" }] },
  Report:           { color: "#BE185D", light: "#FDF2F8", fields: [{ name: "ReportID", pk: true }, { name: "Scope" }, { name: "Metrics" }, { name: "GeneratedDate" }] },
  Notification:     { color: "#BE185D", light: "#FDF2F8", fields: [{ name: "NotificationID", pk: true }, { name: "UserID", fk: "User" }, { name: "EntityID" }, { name: "Message" }, { name: "Category" }, { name: "Status" }, { name: "CreatedDate" }] },
};

const HEADER_H = 36;
const FIELD_H = 28;
const TABLE_W = 200;
const GAP_X = 60;
const GAP_Y = 50;

// Grid positions [col, row]
const POSITIONS = {
  User:             [1, 0],
  AuditLog:         [0, 1],
  Course:           [2, 0],
  Student:          [4, 0],
  Notification:     [3, 1],
  Curriculum:       [1, 2],
  Enrollment:       [2, 2],
  StudentDocument:  [4, 1],
  Content:          [0, 3],
  ContentAccess:    [1, 3],
  Assessment:       [2, 3],
  Submission:       [3, 2],
  Progress:         [3, 3],
  ComplianceRecord: [0, 4],
  Audit:            [1, 4],
  Report:           [4, 3],
};

function tableHeight(name) {
  return HEADER_H + TABLES[name].fields.length * FIELD_H + 8;
}

function tableX(name) { return POSITIONS[name][0] * (TABLE_W + GAP_X) + 30; }
function tableY(name) { return POSITIONS[name][1] * 220 + 30; }

function fieldCenterY(tableName, fieldName) {
  const fields = TABLES[tableName].fields;
  const idx = fields.findIndex(f => f.name === fieldName);
  return tableY(tableName) + HEADER_H + idx * FIELD_H + FIELD_H / 2;
}

function pkFieldName(tableName) {
  return TABLES[tableName].fields.find(f => f.pk)?.name;
}

// Build connections: each FK field -> PK of referenced table
const CONNECTIONS = [];
Object.entries(TABLES).forEach(([tName, tData]) => {
  tData.fields.forEach(f => {
    if (f.fk) {
      const pkField = pkFieldName(f.fk);
      if (pkField) {
        CONNECTIONS.push({
          fromTable: tName,
          fromField: f.name,
          toTable: f.fk,
          toField: pkField,
          color: tData.color,
        });
      }
    }
  });
});

const SVG_W = 5 * (TABLE_W + GAP_X) + 60;
const SVG_H = 5 * 220 + 60;

function bezierPath(x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1);
  const cx = dx * 0.55;
  return `M${x1},${y1} C${x1 + (x1 < x2 ? cx : -cx)},${y1} ${x2 + (x1 < x2 ? -cx : cx)},${y2} ${x2},${y2}`;
}

export default function App() {
  const [activeTable, setActiveTable] = useState(null);
  const [activeConn, setActiveConn] = useState(null);

  const relatedTables = activeTable
    ? new Set(CONNECTIONS.filter(c => c.fromTable === activeTable || c.toTable === activeTable).flatMap(c => [c.fromTable, c.toTable]))
    : null;

  const activeConns = activeTable
    ? CONNECTIONS.filter(c => c.fromTable === activeTable || c.toTable === activeTable)
    : activeConn
    ? CONNECTIONS.filter(c => `${c.fromTable}.${c.fromField}` === activeConn)
    : [];

  function connKey(c) { return `${c.fromTable}.${c.fromField}`; }

  function getLinePoints(c) {
    const fromRect_x = tableX(c.fromTable);
    const toRect_x = tableX(c.toTable);
    const fromW = TABLE_W;
    const fy = fieldCenterY(c.fromTable, c.fromField);
    const ty = fieldCenterY(c.toTable, c.toField);

    let x1, x2;
    if (fromRect_x + fromW <= toRect_x) {
      x1 = fromRect_x + fromW; x2 = toRect_x;
    } else if (toRect_x + TABLE_W <= fromRect_x) {
      x1 = fromRect_x; x2 = toRect_x + TABLE_W;
    } else if (fromRect_x >= toRect_x) {
      x1 = fromRect_x; x2 = toRect_x + TABLE_W;
    } else {
      x1 = fromRect_x + fromW; x2 = toRect_x;
    }
    return { x1, y1: fy, x2, y2: ty };
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9", fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: "#fff", borderBottom: "2px solid #E2E8F0", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg,#2563EB,#7C3AED)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🎓</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0F172A", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>EduConnect — ER Diagram with PK / FK Connections</div>
            <div style={{ fontSize: 11.5, color: "#64748B" }}>16 tables · {CONNECTIONS.length} FK→PK connections · Click a table or connection to highlight</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, fontSize: 12, alignItems: "center" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ background: "#FEF9C3", border: "2px solid #F59E0B", borderRadius: 3, padding: "1px 7px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 600, color: "#92400E" }}>🔑 PK</span>
            <span style={{ color: "#64748B" }}>Primary Key</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ background: "#EDE9FE", border: "2px solid #7C3AED", borderRadius: 3, padding: "1px 7px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 600, color: "#4C1D95" }}>🔗 FK</span>
            <span style={{ color: "#64748B" }}>Foreign Key</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <svg width={36} height={10}><line x1={0} y1={5} x2={28} y2={5} stroke="#6366F1" strokeWidth={2} strokeDasharray="4,2"/><polygon points="28,2 36,5 28,8" fill="#6366F1"/></svg>
            <span style={{ color: "#64748B" }}>FK → PK link</span>
          </span>
        </div>
      </div>

      {/* FK Connection chips */}
      <div style={{ background: "#fff", borderBottom: "1px solid #E2E8F0", padding: "8px 28px", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.5px", marginRight: 4 }}>FK Links:</span>
        {CONNECTIONS.map(c => (
          <button
            key={connKey(c)}
            onMouseEnter={() => setActiveConn(connKey(c))}
            onMouseLeave={() => setActiveConn(null)}
            style={{
              padding: "3px 9px", borderRadius: 5, cursor: "pointer", fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10.5, fontWeight: 600, transition: "all 0.15s",
              border: `1.5px solid ${activeConn === connKey(c) ? c.color : "#E2E8F0"}`,
              background: activeConn === connKey(c) ? `${c.color}18` : "#F8FAFC",
              color: activeConn === connKey(c) ? c.color : "#475569",
            }}
          >
            {c.fromTable}.<span style={{ color: "#7C3AED" }}>{c.fromField}</span> → {c.toTable}.<span style={{ color: "#D97706" }}>{c.toField}</span>
          </button>
        ))}
        {activeTable && (
          <button onClick={() => setActiveTable(null)} style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 6, border: "1px solid #CBD5E1", background: "#F1F5F9", fontSize: 11, cursor: "pointer", color: "#475569" }}>✕ Clear</button>
        )}
      </div>

      {/* SVG Canvas */}
      <div style={{ overflow: "auto", padding: "12px 8px" }}>
        <svg width={SVG_W} height={SVG_H}>
          <defs>
            {Object.entries(TABLES).map(([name, t]) => (
              <marker key={name} id={`arr-${name}`} markerWidth={9} markerHeight={9} refX={7} refY={3.5} orient="auto">
                <polygon points="0,0 0,7 9,3.5" fill={t.color} />
              </marker>
            ))}
            <marker id="arr-dim" markerWidth={9} markerHeight={9} refX={7} refY={3.5} orient="auto">
              <polygon points="0,0 0,7 9,3.5" fill="#CBD5E1" />
            </marker>
          </defs>

          {/* Draw all connection lines */}
          {CONNECTIONS.map(c => {
            const { x1, y1, x2, y2 } = getLinePoints(c);
            const isActive = activeConns.some(ac => ac.fromTable === c.fromTable && ac.fromField === c.fromField);
            const isDim = (activeTable || activeConn) && !isActive;
            const ck = connKey(c);
            return (
              <g key={ck}>
                {/* Hit area */}
                <path d={bezierPath(x1, y1, x2, y2)} fill="none" stroke="transparent" strokeWidth={12}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={() => setActiveConn(ck)}
                  onMouseLeave={() => setActiveConn(null)}
                />
                <path
                  d={bezierPath(x1, y1, x2, y2)}
                  fill="none"
                  stroke={isDim ? "#E2E8F0" : isActive ? c.color : "#A5B4FC"}
                  strokeWidth={isActive ? 2.5 : 1.5}
                  strokeDasharray={isActive ? "none" : "6,3"}
                  opacity={isDim ? 0.25 : 1}
                  markerEnd={isDim ? "url(#arr-dim)" : `url(#arr-${c.toTable})`}
                  style={{ transition: "all 0.18s" }}
                />
                {/* Label on active */}
                {isActive && (
                  <text
                    x={(x1 + x2) / 2}
                    y={(y1 + y2) / 2 - 6}
                    textAnchor="middle"
                    fontSize={9.5}
                    fontFamily="'IBM Plex Mono', monospace"
                    fontWeight="600"
                    fill={c.color}
                    style={{ pointerEvents: "none" }}
                  >
                    {c.fromField} → {c.toField}
                  </text>
                )}
              </g>
            );
          })}

          {/* Draw tables */}
          {Object.entries(TABLES).map(([name, t]) => {
            const x = tableX(name);
            const y = tableY(name);
            const h = tableHeight(name);
            const isHov = activeTable === name;
            const isDim = relatedTables && !relatedTables.has(name);

            return (
              <g key={name} style={{ cursor: "pointer" }} opacity={isDim ? 0.2 : 1}
                onClick={() => setActiveTable(activeTable === name ? null : name)}>
                {/* Drop shadow */}
                <rect x={x + 3} y={y + 3} width={TABLE_W} height={h} rx={9} fill="rgba(0,0,0,0.08)" />
                {/* Card */}
                <rect x={x} y={y} width={TABLE_W} height={h} rx={9} fill="#fff"
                  stroke={isHov ? t.color : "#CBD5E1"} strokeWidth={isHov ? 2.5 : 1} />
                {/* Header */}
                <rect x={x} y={y} width={TABLE_W} height={HEADER_H} rx={9} fill={t.color} />
                <rect x={x} y={y + 14} width={TABLE_W} height={HEADER_H - 14} fill={t.color} />
                <text x={x + 10} y={y + 23} fill="#fff" fontSize={13} fontWeight="700" fontFamily="'Plus Jakarta Sans', sans-serif">{name}</text>

                {/* Fields */}
                {t.fields.map((f, i) => {
                  const fy = y + HEADER_H + i * FIELD_H;
                  const isPK = !!f.pk;
                  const isFK = !!f.fk;
                  const connIsActive = (activeConn && activeConn === `${name}.${f.name}`) ||
                    (activeTable && CONNECTIONS.some(c => (c.fromTable === name && c.fromField === f.name) || (c.toTable === name && c.toField === f.name)));

                  return (
                    <g key={f.name}>
                      <rect x={x + 1} y={fy} width={TABLE_W - 2} height={FIELD_H}
                        fill={connIsActive ? `${t.color}22` : isPK ? "#FEFCE8" : isFK ? "#EDE9FE" : i % 2 === 0 ? "#fff" : "#F8FAFC"}
                        rx={i === t.fields.length - 1 ? 8 : 0}
                      />
                      {/* Divider */}
                      <line x1={x + 1} y1={fy} x2={x + TABLE_W - 1} y2={fy} stroke="#F1F5F9" strokeWidth={1} />

                      {/* PK/FK badge */}
                      {isPK && (
                        <rect x={x + 6} y={fy + 6} width={24} height={16} rx={4} fill="#FEF08A" stroke="#F59E0B" strokeWidth={1.2} />
                      )}
                      {isPK && <text x={x + 10} y={fy + 18} fontSize={9} fontWeight="700" fill="#92400E" fontFamily="'IBM Plex Mono',monospace">PK</text>}

                      {isFK && (
                        <rect x={x + 6} y={fy + 6} width={24} height={16} rx={4} fill="#EDE9FE" stroke="#7C3AED" strokeWidth={1.2} />
                      )}
                      {isFK && <text x={x + 9} y={fy + 18} fontSize={9} fontWeight="700" fill="#4C1D95" fontFamily="'IBM Plex Mono',monospace">FK</text>}

                      <text x={isPK || isFK ? x + 36 : x + 10} y={fy + 18}
                        fontSize={11.5} fill={isPK ? "#92400E" : isFK ? "#4C1D95" : "#374151"}
                        fontWeight={isPK || isFK ? "600" : "400"}
                        fontFamily="'IBM Plex Mono', monospace">
                        {f.name}
                      </text>

                      {/* FK ref label */}
                      {isFK && (
                        <text x={x + TABLE_W - 6} y={fy + 18} fontSize={9.5} fill="#7C3AED" textAnchor="end" fontFamily="'IBM Plex Mono',monospace" opacity={0.8}>
                          → {f.fk}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Bottom border radius fill */}
                <rect x={x + 1} y={y + h - 9} width={TABLE_W - 2} height={8} rx={8} fill={t.light} />
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
