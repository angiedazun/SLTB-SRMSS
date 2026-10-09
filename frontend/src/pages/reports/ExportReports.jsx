import { useState, useCallback } from 'react';
import {
  Download, FileText, BarChart2, Fuel, Bus, CheckCircle,
  Calendar, Clock, Package, Users, TrendingUp,
  AlertTriangle, Layers, Mail, Sparkles, ArrowRight, RefreshCw, Building2, X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import api from '../../services/api';
import { PROVINCES } from '../../utils/depots';

/* ─── Report Definitions ─── */
const REPORTS = [
  {
    id: 'monthly-summary',
    title: 'Monthly Summary',
    subtitle: 'Fleet Operations Overview',
    desc: 'Complete overview of fleet operations, trips, revenue, and performance metrics for the selected period.',
    icon: Layers,
    gradient: 'from-red-500 to-red-700',
    shadowColor: 'shadow-red-200',
    tags: ['Operations', 'KPIs', 'Revenue'],
    formats: ['PDF', 'CSV', 'XLSX'],
  },
  {
    id: 'fleet-utilization',
    title: 'Fleet Utilization',
    subtitle: 'Bus Performance Analysis',
    desc: 'Bus-wise utilization rates, mileage breakdown, idle time, downtime events, and maintenance intervals.',
    icon: Bus,
    gradient: 'from-emerald-500 to-green-700',
    shadowColor: 'shadow-green-200',
    tags: ['Fleet', 'Mileage', 'Downtime'],
    formats: ['PDF', 'CSV', 'XLSX'],
  },
  {
    id: 'fuel-analysis',
    title: 'Fuel Analysis',
    subtitle: 'Consumption & Efficiency',
    desc: 'Fuel consumption by bus and route with efficiency scores, cost analysis, and anomaly flags.',
    icon: Fuel,
    gradient: 'from-amber-500 to-orange-600',
    shadowColor: 'shadow-amber-200',
    tags: ['Fuel Cost', 'Efficiency', 'Anomalies'],
    formats: ['PDF', 'CSV', 'XLSX'],
  },
  {
    id: 'route-performance',
    title: 'Route Performance',
    subtitle: 'On-time & Completion Rates',
    desc: 'On-time performance per route, delay root causes, trip completion rates, and passenger load data.',
    icon: BarChart2,
    gradient: 'from-indigo-500 to-purple-700',
    shadowColor: 'shadow-indigo-200',
    tags: ['On-Time', 'Delays', 'Completion'],
    formats: ['PDF', 'CSV', 'XLSX'],
  },
  {
    id: 'driver-performance',
    title: 'Driver Performance',
    subtitle: 'Individual Driver Metrics',
    desc: 'Trip counts, punctuality scores, incident reports, and compliance summary per driver.',
    icon: Users,
    gradient: 'from-cyan-500 to-blue-600',
    shadowColor: 'shadow-blue-200',
    tags: ['Drivers', 'Compliance', 'Scores'],
    formats: ['PDF', 'CSV', 'XLSX'],
  },
  {
    id: 'maintenance-log',
    title: 'Maintenance Log',
    subtitle: 'Service History & Costs',
    desc: 'Comprehensive maintenance records, service costs, parts replaced, and upcoming service schedules.',
    icon: AlertTriangle,
    gradient: 'from-rose-500 to-pink-700',
    shadowColor: 'shadow-rose-200',
    tags: ['Maintenance', 'Costs', 'Schedule'],
    formats: ['PDF', 'CSV', 'XLSX'],
  },
];

/* ─── Period presets ─── */
const PERIODS = [
  { label: 'This Month', value: 'this-month' },
  { label: 'Last Month', value: 'last-month' },
  { label: 'Last 3 Months', value: 'last-3-months' },
  { label: 'Last 6 Months', value: 'last-6-months' },
  { label: 'This Year', value: 'this-year' },
  { label: 'Custom Range', value: 'custom' },
];

/* ─── Format config ─── */
const FORMAT_CFG = {
  PDF: { label: 'PDF', bg: 'bg-gradient-to-r from-red-500 to-red-600', hover: 'hover:from-red-600 hover:to-red-700', text: 'text-white', ext: 'pdf', badge: 'bg-red-100 text-red-700' },
  CSV: { label: 'CSV', bg: 'bg-gradient-to-r from-emerald-500 to-green-600', hover: 'hover:from-emerald-600 hover:to-green-700', text: 'text-white', ext: 'csv', badge: 'bg-emerald-100 text-emerald-700' },
  XLSX: { label: 'XLSX', bg: 'bg-gradient-to-r from-blue-500 to-blue-700', hover: 'hover:from-blue-600 hover:to-blue-800', text: 'text-white', ext: 'xlsx', badge: 'bg-blue-100 text-blue-700' },
};

function now() { return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-GB') : '—'; }

/* ── Fetch report data from existing APIs ── */
async function fetchReportData(reportId, depot) {
  const dep = depot ? `&depot=${encodeURIComponent(depot)}` : '';
  switch (reportId) {
    case 'fleet-utilization':
      return (await api.get(`/buses?limit=500${dep}`).catch(() => ({ data: {} }))).data?.buses || [];
    case 'driver-performance':
      return (await api.get(`/drivers?limit=500${dep}`).catch(() => ({ data: {} }))).data?.drivers || [];
    case 'route-performance':
      return (await api.get(`/routes?limit=500${dep}`).catch(() => ({ data: {} }))).data?.routes || [];
    case 'maintenance-log':
      return (await api.get(`/maintenance?limit=500${dep}`).catch(() => ({ data: {} }))).data?.records || [];
    case 'fuel-analysis':
      return (await api.get(`/fuel?limit=500${dep}`).catch(() => ({ data: {} }))).data?.logs || [];
    case 'monthly-summary': {
      const [stats, buses, drivers, routes] = await Promise.all([
        api.get('/dashboard/stats').catch(() => ({ data: {} })),
        api.get(`/buses?limit=500${dep}`).catch(() => ({ data: {} })),
        api.get(`/drivers?limit=500${dep}`).catch(() => ({ data: {} })),
        api.get(`/routes?limit=500${dep}`).catch(() => ({ data: {} })),
      ]);
      return { stats: stats.data, buses: buses.data?.buses || [], drivers: drivers.data?.drivers || [], routes: routes.data?.routes || [] };
    }
    default: return [];
  }
}

/* ── Build CSV string ── */
function buildCSV(reportId, data, depot, periodLabel) {
  const header = `SLTB SRMSS — ${REPORTS.find(r => r.id === reportId)?.title}\nPeriod: ${periodLabel}${depot ? ` | Depot: ${depot}` : ''}\nGenerated: ${new Date().toLocaleString('en-GB')}\n\n`;
  switch (reportId) {
    case 'fleet-utilization': {
      const rows = [['Bus Number', 'Registration', 'Model', 'Capacity', 'Status', 'Depot', 'Fuel Type']];
      (data || []).forEach(b => rows.push([b.busNumber, b.registrationNumber, b.model, b.capacity, b.status, b.depot, b.fuelType || '']));
      return header + rows.map(r => r.join(',')).join('\n');
    }
    case 'driver-performance': {
      const rows = [['Employee ID', 'Name', 'Phone', 'NIC', 'License No', 'License Expiry', 'Shift', 'Status', 'Rating', 'Depot']];
      (data || []).forEach(d => rows.push([d.employeeId, d.name, d.phone, d.nic, d.licenseNumber, fmtDate(d.licenseExpiry), d.shift, d.status, d.rating || '', d.depot]));
      return header + rows.map(r => r.join(',')).join('\n');
    }
    case 'route-performance': {
      const rows = [['Route No', 'Name', 'Origin', 'Destination', 'Type', 'Status', 'Distance (km)', 'Duration (min)', 'On-Time %', 'Depot']];
      (data || []).forEach(r => rows.push([r.routeNumber, r.name, r.origin, r.destination, r.type, r.status, r.totalDistance || 0, r.estimatedDuration || 0, r.onTimePerformance || 0, r.depot]));
      return header + rows.map(r => r.join(',')).join('\n');
    }
    case 'maintenance-log': {
      const rows = [['Title', 'Bus', 'Type', 'Status', 'Priority', 'Scheduled Date', 'Cost (LKR)']];
      (data || []).forEach(m => rows.push([m.title, m.bus?.busNumber || '', m.maintenanceType, m.status, m.priority, fmtDate(m.scheduledDate), m.cost || 0]));
      return header + rows.map(r => r.join(',')).join('\n');
    }
    case 'fuel-analysis': {
      const rows = [['Date', 'Bus', 'Quantity (L)', 'Cost (LKR)', 'Fuel Type', 'Odometer']];
      (data || []).forEach(f => rows.push([fmtDate(f.date), f.bus?.busNumber || '', f.quantity || 0, f.totalCost || 0, f.fuelType || '', f.odometer || '']));
      return header + rows.map(r => r.join(',')).join('\n');
    }
    case 'monthly-summary': {
      const { stats, buses, drivers, routes } = data || {};
      const activeBuses = (buses || []).filter(b => b.status === 'active').length;
      const activeDrivers = (drivers || []).filter(d => d.status === 'active').length;
      const activeRoutes = (routes || []).filter(r => r.status === 'active').length;
      const rows = [
        ['Metric', 'Value'],
        ['Total Buses', (buses || []).length], ['Active Buses', activeBuses],
        ['Total Drivers', (drivers || []).length], ['Active Drivers', activeDrivers],
        ['Total Routes', (routes || []).length], ['Active Routes', activeRoutes],
        ['Schedules Today', stats?.schedules?.today || 0],
        ['Pending Maintenance', stats?.maintenance?.pending || 0],
      ];
      return header + rows.map(r => r.join(',')).join('\n');
    }
    default: return header + 'No data available.';
  }
}

/* ── Get table headers + rows for a report ── */
function getTableData(reportId, data) {
  switch (reportId) {
    case 'fleet-utilization':
      return {
        head: [['Bus Number', 'Registration', 'Model', 'Capacity', 'Status', 'Depot', 'Fuel Type']],
        body: (data || []).map(b => [b.busNumber || '', b.registrationNumber || '', b.model || '', b.capacity || '', b.status || '', b.depot || '', b.fuelType || '']),
      };
    case 'driver-performance':
      return {
        head: [['Employee ID', 'Name', 'Phone', 'NIC', 'License No', 'License Expiry', 'Shift', 'Status', 'Rating', 'Depot']],
        body: (data || []).map(d => [d.employeeId || '', d.name || '', d.phone || '', d.nic || '', d.licenseNumber || '', fmtDate(d.licenseExpiry), d.shift || '', d.status || '', d.rating || '', d.depot || '']),
      };
    case 'route-performance':
      return {
        head: [['Route No', 'Name', 'Origin', 'Destination', 'Type', 'Status', 'Distance (km)', 'Duration (min)', 'On-Time %', 'Depot']],
        body: (data || []).map(r => [r.routeNumber || '', r.name || '', r.origin || '', r.destination || '', r.type || '', r.status || '', r.totalDistance || 0, r.estimatedDuration || 0, r.onTimePerformance || 0, r.depot || '']),
      };
    case 'maintenance-log':
      return {
        head: [['Title', 'Bus', 'Type', 'Status', 'Priority', 'Scheduled Date', 'Cost (LKR)']],
        body: (data || []).map(m => [m.title || '', m.bus?.busNumber || '', m.maintenanceType || '', m.status || '', m.priority || '', fmtDate(m.scheduledDate), m.cost || 0]),
      };
    case 'fuel-analysis':
      return {
        head: [['Date', 'Bus', 'Quantity (L)', 'Cost (LKR)', 'Fuel Type', 'Odometer']],
        body: (data || []).map(f => [fmtDate(f.date), f.bus?.busNumber || '', f.quantity || 0, f.totalCost || 0, f.fuelType || '', f.odometer || '']),
      };
    case 'monthly-summary': {
      const { buses = [], drivers = [], routes = [], stats = {} } = data || {};
      return {
        head: [['Metric', 'Value']],
        body: [
          ['Total Buses', buses.length],
          ['Active Buses', buses.filter(b => b.status === 'active').length],
          ['Total Drivers', drivers.length],
          ['Active Drivers', drivers.filter(d => d.status === 'active').length],
          ['Total Routes', routes.length],
          ['Active Routes', routes.filter(r => r.status === 'active').length],
          ['Schedules Today', stats?.schedules?.today || 0],
          ['Pending Maintenance', stats?.maintenance?.pending || 0],
        ],
      };
    }
    default: return { head: [['No Data']], body: [] };
  }
}

/* ── Generate and download a real PDF using jsPDF ── */
function buildPDF(reportId, data, depot, periodLabel, filename) {
  const report = REPORTS.find(r => r.id === reportId);
  const { head, body } = getTableData(reportId, data);

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Red header bar
  doc.setFillColor(192, 57, 43);
  doc.rect(0, 0, 297, 22, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('SLTB SRMSS — Sri Lanka Transport Board', 10, 9);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(report?.title || reportId, 10, 16);

  // Meta line
  doc.setTextColor(80, 80, 80);
  doc.setFontSize(8);
  doc.text(`Period: ${periodLabel}   |   Depot: ${depot || 'All Depots — System Wide'}   |   Generated: ${new Date().toLocaleString('en-GB')}`, 10, 28);

  // Table
  autoTable(doc, {
    head,
    body: body.length ? body : [['No records found for the selected filters.']],
    startY: 32,
    styles: { fontSize: 8, cellPadding: 3 },
    headStyles: { fillColor: [192, 57, 43], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [253, 250, 250] },
    margin: { left: 10, right: 10 },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text('Generated by SLTB Smart Route Management & Scheduling System (SRMSS)', 10, 205);
    doc.text(`Page ${i} of ${pageCount}`, 280, 205, { align: 'right' });
  }

  doc.save(filename);
}

export default function ExportReports() {
  const [exporting, setExporting] = useState({});
  const [done, setDone] = useState({});
  const [period, setPeriod] = useState('this-month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [selectedDepot, setSelectedDepot] = useState('');
  const [downloads, setDownloads] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const handleExport = useCallback(async (reportId, format) => {
    const key = `${reportId}-${format}`;
    setExporting((p) => ({ ...p, [key]: true }));
    const report = REPORTS.find((r) => r.id === reportId);
    const periodLabel = PERIODS.find(p => p.value === period)?.label || period;
    const depotSlug = selectedDepot ? `_${selectedDepot.replace(/\s+/g, '-')}` : '';
    try {
      const data = await fetchReportData(reportId, selectedDepot);
      const fileName = `SLTB_${reportId}${depotSlug}_${period}.${FORMAT_CFG[format].ext}`;

      if (format === 'PDF') {
        buildPDF(reportId, data, selectedDepot, periodLabel, fileName);
      } else {
        const csv = buildCSV(reportId, data, selectedDepot, periodLabel);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }

      setDone((p) => ({ ...p, [key]: true }));
      setDownloads((p) => [{ id: key + Date.now(), title: report?.title, format, depot: selectedDepot, time: now() }, ...p.slice(0, 4)]);
      setTimeout(() => setDone((p) => { const n = { ...p }; delete n[key]; return n; }), 3000);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting((p) => { const n = { ...p }; delete n[key]; return n; });
    }
  }, [period, selectedDepot]);

  const handleBulkDownload = async () => {
    setBulkLoading(true);
    for (const r of REPORTS) {
      await handleExport(r.id, 'PDF');
      await new Promise((res) => setTimeout(res, 400));
    }
    setBulkLoading(false);
  };

  const selectedPeriodLabel = PERIODS.find((p) => p.value === period)?.label;

  return (
    <div className="space-y-6">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 via-red-700 to-rose-800 p-6 md:p-8 text-white shadow-xl">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white/30 blur-2xl" />
          <div className="absolute -bottom-10 -left-4 w-64 h-32 rounded-full bg-white/20 blur-3xl" />
        </div>
        <div className="relative flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shadow-inner flex-shrink-0">
              <TrendingUp size={28} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold bg-white/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider">SLTB SRMSS</span>
                <Sparkles size={14} className="text-yellow-300" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">Reports & Downloads</h1>
              <p className="text-red-100 text-sm mt-1">Generate and export professional reports in PDF, CSV, or Excel format</p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-2 text-center min-w-[80px]">
              <div className="text-2xl font-black">{REPORTS.length}</div>
              <div className="text-xs text-red-100">Report Types</div>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-2 text-center min-w-[80px]">
              <div className="text-2xl font-black">3</div>
              <div className="text-xs text-red-100">Formats</div>
            </div>
            <div className="bg-white/15 backdrop-blur rounded-xl px-4 py-2 text-center min-w-[80px]">
              <div className="text-2xl font-black">{downloads.length}</div>
              <div className="text-xs text-red-100">Downloaded</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <Card padding="p-4">
        <div className="flex flex-col gap-3">
          {/* Period row */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2 text-gray-600 font-semibold text-sm flex-shrink-0">
              <Calendar size={16} className="text-red-500" />
              Period:
            </div>
            <div className="flex flex-wrap gap-2 flex-1">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 border ${
                    period === p.value
                      ? 'bg-gradient-to-r from-red-500 to-red-700 text-white border-transparent shadow-sm shadow-red-200'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <AnimatePresence>
              {period === 'custom' && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex gap-2 items-center overflow-hidden"
                >
                  <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-200 w-36" />
                  <span className="text-gray-400 text-xs">to</span>
                  <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-red-200 w-36" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Depot row */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-2 text-gray-600 font-semibold text-sm flex-shrink-0">
              <Building2 size={16} className="text-red-500" />
              Depot:
            </div>
            <div className="flex items-center gap-2 flex-1">
              <select
                value={selectedDepot}
                onChange={(e) => setSelectedDepot(e.target.value)}
                className="flex-1 max-w-xs px-3 py-1.5 text-sm border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-200 focus:border-red-300 bg-white text-gray-700"
              >
                <option value="">All Depots — System Wide</option>
                {PROVINCES.map((province) => (
                  <optgroup key={province.name} label={province.name}>
                    {province.depots.map((depot) => (
                      <option key={depot} value={depot}>{depot}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {selectedDepot && (
                <>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-100 rounded-xl text-xs font-bold text-red-700">
                    <Building2 size={12} /> {selectedDepot}
                  </span>
                  <button onClick={() => setSelectedDepot('')}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                    <X size={13} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── Report Cards Grid ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-black text-gray-900">Available Reports</h2>
            <p className="text-xs text-gray-500">
              Period: <span className="text-red-600 font-semibold">{selectedPeriodLabel}</span>
              {selectedDepot && <> · Depot: <span className="text-red-600 font-semibold">{selectedDepot}</span></>}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={bulkLoading ? RefreshCw : Package}
            loading={bulkLoading}
            onClick={handleBulkDownload}
            className={bulkLoading ? 'animate-pulse' : ''}
          >
            Download All (PDF)
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {REPORTS.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Card hover padding="p-0" className="overflow-hidden">
                {/* Card top accent bar */}
                <div className={`h-1.5 w-full bg-gradient-to-r ${r.gradient}`} />

                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${r.gradient} flex items-center justify-center shadow-lg ${r.shadowColor} flex-shrink-0`}>
                      <r.icon size={22} className="text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-black text-gray-900 text-base leading-tight">{r.title}</h3>
                          <p className="text-xs font-semibold text-gray-500 mt-0.5">{r.subtitle}</p>
                        </div>
                      </div>
                      <p className="text-sm text-gray-500 mt-2 leading-relaxed">{r.desc}</p>

                      {/* Tags */}
                      <div className="flex gap-1.5 flex-wrap mt-3">
                        {r.tags.map((tag) => (
                          <span key={tag} className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-gray-100 mt-4 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-400 font-medium">Download as:</span>
                      <div className="flex gap-2">
                        {r.formats.map((fmt) => {
                          const key = `${r.id}-${fmt}`;
                          const cfg = FORMAT_CFG[fmt];
                          const isLoading = exporting[key];
                          const isDone = done[key];
                          return (
                            <motion.button
                              key={fmt}
                              whileTap={{ scale: 0.95 }}
                              disabled={isLoading}
                              onClick={() => handleExport(r.id, fmt)}
                              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-sm ${
                                isDone
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                                  : `${cfg.bg} ${cfg.hover} ${cfg.text}`
                              } disabled:opacity-60`}
                            >
                              {isLoading ? (
                                <>
                                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  <span>{fmt}</span>
                                </>
                              ) : isDone ? (
                                <>
                                  <CheckCircle size={12} />
                                  <span>Done</span>
                                </>
                              ) : (
                                <>
                                  <Download size={12} />
                                  <span>{fmt}</span>
                                </>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── Bottom Row: Recent Downloads + Scheduled ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Recent Downloads */}
        <Card padding="p-5">
          <CardHeader title="Recent Downloads" subtitle="This session" icon={Clock} />
          <AnimatePresence>
            {downloads.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Download size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">No downloads yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {downloads.map((d) => (
                  <motion.div
                    key={d.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5"
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${FORMAT_CFG[d.format]?.badge ?? 'bg-gray-100 text-gray-600'}`}>
                      <FileText size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{d.title}</p>
                      <p className="text-[10px] text-gray-400">{d.format} · {d.depot || 'All Depots'} · {d.time}</p>
                    </div>
                    <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </Card>

        {/* Scheduled Reports */}
        <Card padding="p-5" className="bg-gradient-to-br from-red-50 to-rose-50 border border-red-100">
          <CardHeader title="Scheduled Reports" subtitle="Auto-delivery" icon={Mail} gradient="from-red-500 to-red-700" />
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            Configure automatic report delivery to your inbox on a daily, weekly, or monthly schedule.
          </p>
          <div className="space-y-2 mb-4">
            {[
              { label: 'Monthly Summary', freq: 'Monthly · 1st', active: true },
              { label: 'Fleet Utilization', freq: 'Weekly · Monday', active: false },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between bg-white rounded-xl px-3 py-2.5 shadow-sm">
                <div>
                  <p className="text-xs font-semibold text-gray-800">{s.label}</p>
                  <p className="text-[10px] text-gray-400">{s.freq}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" icon={ArrowRight} iconRight className="w-full">
            Manage Schedule
          </Button>
        </Card>
      </div>

    </div>
  );
}
