import { useState } from 'react';
import useSWR from 'swr';
import { API_URL } from '../config';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import './CableReports.css';

const fetcher = (url) => fetch(url).then(res => res.json());

const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6'];

function CableReports({ onBack }) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Fetch report data
  const { data: report, isLoading } = useSWR(
    `${API_URL}/reports/monthly?month=${selectedMonth}`,
    fetcher
  );

  // Fetch last 6 months data for trend chart
  const { data: trendData } = useSWR(
    `${API_URL}/reports/trend`,
    fetcher
  );

  // Fetch all customers for export
  const { data: allCustomers = [] } = useSWR(`${API_URL}/customers`, fetcher);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatShortCurrency = (amount) => {
    if (amount >= 1000) {
      return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount}`;
  };

  const getMonthName = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  };

  const getShortMonth = (monthStr) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString('en-IN', { month: 'short' });
  };

  // Generate month options
  const monthOptions = [];
  const now = new Date();
  for (let i = -12; i <= 2; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthOptions.push({ value, label: getMonthName(value) });
  }

  // Chart data
  const pieData = [
    { name: 'Paid', value: report?.paidCount || 0, color: '#22c55e' },
    { name: 'Unpaid', value: report?.unpaidCount || 0, color: '#ef4444' }
  ];

  const collectionData = [
    { name: 'Collected', amount: report?.totalCollected || 0 },
    { name: 'Pending', amount: report?.totalPending || 0 }
  ];

  // Area-wise data
  const areaData = (() => {
    if (!report?.payments) return [];
    const areas = {};
    report.payments.forEach(p => {
      const area = p.area || 'Unknown';
      areas[area] = (areas[area] || 0) + (p.amount || 0);
    });
    return Object.entries(areas)
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  })();

  // Trend data for line chart
  const trendChartData = (trendData || []).map(t => ({
    month: getShortMonth(t.month),
    collected: t.collected,
    pending: t.pending
  }));

  // Export to CSV
  const exportToCSV = (data, filename) => {
    if (!data || data.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
  };

  const exportPayments = () => {
    const data = (report?.payments || []).map(p => ({
      'Customer Name': p.customer_name,
      'Phone': p.customer_phone,
      'Amount': p.amount,
      'Payment Mode': p.payment_mode,
      'Month': p.month,
      'Date': new Date(p.paid_date).toLocaleDateString('en-IN')
    }));
    exportToCSV(data, `cable-payments-${selectedMonth}.csv`);
  };

  const exportUnpaid = () => {
    const data = (report?.unpaidCustomers || []).map(c => ({
      'Customer Name': c.name,
      'Phone': c.phone,
      'STB Number': c.stb_number,
      'Area': c.area,
      'Monthly Amount': c.monthly_amount,
      'Address': c.address
    }));
    exportToCSV(data, `cable-unpaid-${selectedMonth}.csv`);
  };

  const exportAllCustomers = () => {
    const data = allCustomers.map(c => ({
      'Customer Name': c.name,
      'Phone': c.phone,
      'STB Number': c.stb_number,
      'Area': c.area,
      'Monthly Amount': c.monthly_amount,
      'Status': c.status,
      'Address': c.address
    }));
    exportToCSV(data, `cable-all-customers.csv`);
  };

  // Print report
  const printReport = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
      <head>
        <title>Monthly Report - ${getMonthName(selectedMonth)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
          .summary { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background: #f5f5f5; }
          .summary-item { text-align: center; }
          .summary-value { font-size: 1.5em; font-weight: bold; color: #333; }
          .summary-label { color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #333; color: white; }
          tr:nth-child(even) { background: #f9f9f9; }
          h2 { margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #666; }
        </style>
      </head>
      <body>
        <h1>Cable TV Collection Report</h1>
        <p style="text-align: center;">${getMonthName(selectedMonth)}</p>

        <div class="summary">
          <div class="summary-item">
            <div class="summary-value">${report?.totalCustomers || 0}</div>
            <div class="summary-label">Total Active</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${report?.paidCount || 0}</div>
            <div class="summary-label">Paid</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${report?.unpaidCount || 0}</div>
            <div class="summary-label">Unpaid</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${formatCurrency(report?.totalCollected)}</div>
            <div class="summary-label">Collected</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${formatCurrency(report?.totalPending)}</div>
            <div class="summary-label">Pending</div>
          </div>
        </div>

        <h2>Paid Customers (${report?.paidCount || 0})</h2>
        <table>
          <thead>
            <tr><th>#</th><th>Customer</th><th>Phone</th><th>Amount</th><th>Mode</th><th>Date</th></tr>
          </thead>
          <tbody>
            ${(report?.payments || []).map((p, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${p.customer_name}</td>
                <td>${p.customer_phone}</td>
                <td>${formatCurrency(p.amount)}</td>
                <td>${p.payment_mode}</td>
                <td>${new Date(p.paid_date).toLocaleDateString('en-IN')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Unpaid Customers (${report?.unpaidCount || 0})</h2>
        <table>
          <thead>
            <tr><th>#</th><th>Customer</th><th>Phone</th><th>Area</th><th>Amount Due</th></tr>
          </thead>
          <tbody>
            ${(report?.unpaidCustomers || []).map((c, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${c.name}</td>
                <td>${c.phone}</td>
                <td>${c.area || '-'}</td>
                <td>${formatCurrency(c.monthly_amount)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Generated on ${new Date().toLocaleString('en-IN')}
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="cable-reports">
      {/* Header */}
      <header className="page-header">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <h1>Reports</h1>
        <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="month-select">
          {monthOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </header>

      {isLoading ? (
        <div className="loading">Loading report...</div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="report-summary">
            <h2>Summary - {getMonthName(selectedMonth)}</h2>
            <div className="summary-grid">
              <div className="summary-item customers">
                <span className="value">{report?.totalCustomers || 0}</span>
                <span className="label">Active Customers</span>
              </div>
              <div className="summary-item paid">
                <span className="value">{report?.paidCount || 0}</span>
                <span className="label">Paid</span>
              </div>
              <div className="summary-item unpaid">
                <span className="value">{report?.unpaidCount || 0}</span>
                <span className="label">Unpaid</span>
              </div>
              <div className="summary-item collected">
                <span className="value">{formatCurrency(report?.totalCollected)}</span>
                <span className="label">Total Collected</span>
              </div>
              <div className="summary-item pending">
                <span className="value">{formatCurrency(report?.totalPending)}</span>
                <span className="label">Total Pending</span>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="charts-section">
            <h2>Visual Analytics</h2>

            <div className="charts-grid">
              {/* Pie Chart - Paid vs Unpaid */}
              <div className="chart-card">
                <h3>Collection Status</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-legend">
                  <span className="legend-item"><span className="dot green"></span>Paid: {report?.paidCount || 0}</span>
                  <span className="legend-item"><span className="dot red"></span>Unpaid: {report?.unpaidCount || 0}</span>
                </div>
              </div>

              {/* Bar Chart - Collection Amount */}
              <div className="chart-card">
                <h3>Amount Overview</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={collectionData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="name" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" tickFormatter={formatShortCurrency} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                        <Cell fill="#22c55e" />
                        <Cell fill="#f59e0b" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Area-wise Collection */}
              {areaData.length > 0 && (
                <div className="chart-card wide">
                  <h3>Top Areas by Collection</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={areaData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis type="number" stroke="#94a3b8" tickFormatter={formatShortCurrency} />
                        <YAxis type="category" dataKey="name" stroke="#94a3b8" width={80} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="amount" fill="#3b82f6" radius={[0, 8, 8, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Trend Line Chart */}
              {trendChartData.length > 0 && (
                <div className="chart-card wide">
                  <h3>Collection Trend (Last 6 Months)</h3>
                  <div className="chart-container">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={trendChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="month" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" tickFormatter={formatShortCurrency} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line type="monotone" dataKey="collected" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e' }} name="Collected" />
                        <Line type="monotone" dataKey="pending" stroke="#ef4444" strokeWidth={3} dot={{ fill: '#ef4444' }} name="Pending" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Export Options */}
          <div className="export-section">
            <h2>Export Data</h2>
            <div className="export-buttons">
              <button onClick={printReport} className="export-btn print">
                🖨️ Print Report
              </button>
              <button onClick={exportPayments} className="export-btn csv">
                📥 Payments (CSV)
              </button>
              <button onClick={exportUnpaid} className="export-btn csv">
                📥 Unpaid (CSV)
              </button>
              <button onClick={exportAllCustomers} className="export-btn csv">
                📥 All Customers (CSV)
              </button>
            </div>
          </div>

          {/* Unpaid List */}
          <div className="unpaid-section">
            <h2>Unpaid Customers ({report?.unpaidCount || 0})</h2>
            {report?.unpaidCustomers?.length === 0 ? (
              <p className="no-data">All customers have paid! 🎉</p>
            ) : (
              <div className="unpaid-list">
                {report?.unpaidCustomers?.map(c => (
                  <div key={c.id} className="unpaid-item">
                    <div className="unpaid-info">
                      <strong>{c.name}</strong>
                      <span>📱 {c.phone}</span>
                      {c.area && <span>📍 {c.area}</span>}
                    </div>
                    <div className="unpaid-amount">{formatCurrency(c.monthly_amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Payments */}
          <div className="payments-section">
            <h2>Payments This Month ({report?.paidCount || 0})</h2>
            {report?.payments?.length === 0 ? (
              <p className="no-data">No payments recorded yet</p>
            ) : (
              <div className="payments-list">
                {report?.payments?.map(p => (
                  <div key={p.id} className="payment-item">
                    <div className="payment-info">
                      <strong>{p.customer_name}</strong>
                      <span>{new Date(p.paid_date).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="payment-details">
                      <span className="payment-mode">{p.payment_mode}</span>
                      <span className="payment-amount">{formatCurrency(p.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default CableReports;
