import { useState } from 'react';
import { FileText, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export function PDFExportButton({ data, fileName = 'report', title = 'Report' }) {
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = () => {
    setIsExporting(true);
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text(title, 14, 20);
      
      // Add date
      doc.setFontSize(10);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
      
      // Prepare table data
      if (data && data.length > 0) {
        const headers = Object.keys(data[0]);
        const rows = data.map(item =>
          headers.map(header => {
            const value = item[header];
            if (typeof value === 'object') {
              return JSON.stringify(value);
            }
            return String(value);
          })
        );

        doc.autoTable({
          head: [headers],
          body: rows,
          startY: 40,
          styles: {
            fontSize: 9,
            cellPadding: 3,
            overflow: 'linebreak',
          },
          headStyles: {
            fillColor: [59, 130, 246],
            textColor: 255,
            fontStyle: 'bold',
          },
          alternateRowStyles: {
            fillColor: [240, 247, 255],
          },
        });
      }

      doc.save(`${fileName}-${Date.now()}.pdf`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={exportPDF}
      disabled={isExporting}
      className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors"
    >
      <Download size={18} />
      {isExporting ? 'Exporting...' : 'Export PDF'}
    </button>
  );
}

export default PDFExportButton;
