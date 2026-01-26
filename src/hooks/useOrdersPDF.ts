import { useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Order } from '@/types/order';

// Peptium brand colors
const BRAND_COLORS = {
  primary: '#1a1a2e',      // Dark navy
  secondary: '#16213e',    // Darker blue
  accent: '#0f3460',       // Blue accent
  highlight: '#e94560',    // Red/pink accent
  text: '#333333',
  lightGray: '#f5f5f5',
  white: '#ffffff'
};

export function useOrdersPDF() {
  const generateOrdersPDF = useCallback(async (
    orders: Order[], 
    period: 'week' | 'month',
    dateRange: { start: Date; end: Date }
  ) => {
    if (orders.length === 0) {
      alert('No hay órdenes para exportar en este período.');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Load and add logo
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => reject();
        logoImg.src = '/images/peptium-logo.png';
      });
      
      // Add logo (40x15 size, positioned top left)
      doc.addImage(logoImg, 'PNG', 15, 10, 40, 15);
    } catch {
      // If logo fails, just add text
      doc.setFontSize(20);
      doc.setTextColor(BRAND_COLORS.primary);
      doc.text('PEPTIUM', 15, 20);
    }

    // Header background
    doc.setFillColor(BRAND_COLORS.primary);
    doc.rect(0, 30, pageWidth, 25, 'F');

    // Report title
    doc.setFontSize(18);
    doc.setTextColor(BRAND_COLORS.white);
    const periodTitle = period === 'week' ? 'Reporte Semanal de Órdenes' : 'Reporte Mensual de Órdenes';
    doc.text(periodTitle, pageWidth / 2, 45, { align: 'center' });

    // Date range subtitle
    doc.setFontSize(10);
    doc.setTextColor(BRAND_COLORS.lightGray);
    const dateRangeText = `${format(dateRange.start, 'dd MMM yyyy', { locale: es })} - ${format(dateRange.end, 'dd MMM yyyy', { locale: es })}`;
    doc.text(dateRangeText, pageWidth / 2, 52, { align: 'center' });

    // Summary section
    const totalSales = orders.reduce((sum, o) => sum + o.total, 0);
    const avgTicket = orders.length > 0 ? totalSales / orders.length : 0;
    const shippedOrders = orders.filter(o => o.fulfillmentStage === 'shipped').length;
    const pendingOrders = orders.filter(o => !['shipped', 'issue'].includes(o.fulfillmentStage)).length;

    // Summary boxes
    const boxY = 65;
    const boxHeight = 25;
    const boxWidth = (pageWidth - 40) / 4;
    const summaryData = [
      { label: 'Total Órdenes', value: orders.length.toString() },
      { label: 'Ventas Totales', value: `$${totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
      { label: 'Ticket Promedio', value: `$${avgTicket.toFixed(2)}` },
      { label: 'Enviadas', value: `${shippedOrders} / ${orders.length}` }
    ];

    summaryData.forEach((item, index) => {
      const boxX = 15 + (index * (boxWidth + 5));
      
      // Box background
      doc.setFillColor(BRAND_COLORS.lightGray);
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 3, 3, 'F');
      
      // Box border accent
      doc.setDrawColor(BRAND_COLORS.highlight);
      doc.setLineWidth(0.5);
      doc.line(boxX, boxY + boxHeight, boxX + boxWidth, boxY + boxHeight);
      
      // Label
      doc.setFontSize(8);
      doc.setTextColor(BRAND_COLORS.text);
      doc.text(item.label, boxX + boxWidth / 2, boxY + 10, { align: 'center' });
      
      // Value
      doc.setFontSize(12);
      doc.setTextColor(BRAND_COLORS.primary);
      doc.text(item.value, boxX + boxWidth / 2, boxY + 20, { align: 'center' });
    });

    // Orders table
    const tableData = orders.map(order => [
      order.orderNumber,
      order.paidAt ? format(new Date(order.paidAt), 'dd/MM/yyyy HH:mm') : '-',
      order.customer.name || '-',
      order.customer.email || '-',
      `$${order.total.toFixed(2)}`,
      order.fulfillmentStage.toUpperCase()
    ]);

    autoTable(doc, {
      startY: boxY + boxHeight + 15,
      head: [[
        'Nº Orden',
        'Fecha Pago',
        'Cliente',
        'Email',
        'Total',
        'Estado'
      ]],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: BRAND_COLORS.primary,
        textColor: BRAND_COLORS.white,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        textColor: BRAND_COLORS.text,
        fontSize: 9
      },
      alternateRowStyles: {
        fillColor: BRAND_COLORS.lightGray
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 25 },
        1: { halign: 'center', cellWidth: 30 },
        2: { halign: 'left' },
        3: { halign: 'left', cellWidth: 45 },
        4: { halign: 'right', cellWidth: 22 },
        5: { halign: 'center', cellWidth: 20 }
      },
      margin: { left: 15, right: 15 },
      didDrawPage: (data) => {
        // Footer on each page
        const pageNumber = doc.internal.pages.length - 1;
        doc.setFontSize(8);
        doc.setTextColor(BRAND_COLORS.text);
        doc.text(
          `Generado el ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Página ${data.pageNumber}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        
        // Footer line
        doc.setDrawColor(BRAND_COLORS.highlight);
        doc.setLineWidth(1);
        doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
      }
    });

    // Save the PDF
    const filename = period === 'week' 
      ? `peptium_ordenes_semana_${format(new Date(), 'yyyy-MM-dd')}.pdf`
      : `peptium_ordenes_mes_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    
    doc.save(filename);
  }, []);

  return { generateOrdersPDF };
}
