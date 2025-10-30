import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Define os estilos para o documento PDF, similar a CSS
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 30,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottom: '2px solid #333',
    paddingBottom: 10,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  section: {
    marginBottom: 15,
    padding: 10,
    border: '1px solid #EEE',
    borderRadius: 5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    backgroundColor: '#F3F4F6',
    padding: 5,
    borderRadius: 3,
    fontFamily: 'Helvetica-Bold',
  },
  text: {
    fontSize: 10,
    marginBottom: 3,
  },
  table: {
    width: '100%',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottom: '1px solid #333',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #EEE',
    paddingVertical: 4,
  },
  colHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    padding: 5,
    fontFamily: 'Helvetica-Bold',
  },
  col: {
    fontSize: 10,
    padding: 5,
  },
  colProduct: { width: '50%' },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right' },
  totalRow: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 5,
    borderTop: '1px solid #333',
  },
  totalLabel: {
    width: '80%',
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  totalValue: {
    width: '20%',
    textAlign: 'right',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
  },
  signatureSection: {
    marginTop: 60,
    flexDirection: 'column',
    alignItems: 'center',
  },
  signatureLine: {
    width: '60%',
    borderBottom: '1px solid #333',
    marginBottom: 5,
  },
  signatureText: {
    fontSize: 10,
  },
});

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
const formatDateTime = (date: string) => format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

export const OrderInvoice = ({ order, items }: { order: any, items: any[] }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.headerText}>GYMSTORE</Text>
        <Text style={{ fontSize: 12 }}>Nota de Entrega</Text>
      </View>

      {/* Dados do Cliente */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Dados do Cliente</Text>
        <Text style={styles.text}>Nome: {order.profiles?.full_name || 'N/A'}</Text>
        <Text style={styles.text}>Email: {order.profiles?.email || 'N/A'}</Text>
        <Text style={styles.text}>CPF: {order.profiles?.cpf || 'N/A'}</Text>
        <Text style={styles.text}>Telefone: {order.profiles?.phone || 'N/A'}</Text>
        <Text style={styles.text}>Pedido Nº: {order.id ? order.id.substring(0, 8) : 'N/A'}</Text>
        <Text style={styles.text}>
          Data do Pedido: {order.created_at ? formatDateTime(order.created_at) : 'N/A'}
        </Text>
      </View>

      {/* Endereço de Entrega */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Endereço de Entrega</Text>
        <Text style={styles.text}>{order.addresses?.street || 'Rua não informada'}, {order.addresses?.number || 'S/N'}</Text>
        <Text style={styles.text}>{order.addresses?.neighborhood || 'Bairro não informado'} - {order.addresses?.city || 'Cidade não informada'}, {order.addresses?.state || 'UF'}</Text>
        <Text style={styles.text}>CEP: {order.addresses?.zip_code || 'Não informado'}</Text>
      </View>

      {/* Itens do Pedido */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Itens do Pedido</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colHeader, styles.colProduct]}>Produto</Text>
            <Text style={[styles.colHeader, styles.colQty]}>Qtd.</Text>
            <Text style={[styles.colHeader, styles.colPrice]}>Preço Unit.</Text>
            <Text style={[styles.colHeader, styles.colTotal]}>Subtotal</Text>
          </View>
          {items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.col, styles.colProduct]}>{item.products?.name || 'Produto desconhecido'}</Text>
              <Text style={[styles.col, styles.colQty]}>{item.quantity || 0}</Text>
              <Text style={[styles.col, styles.colPrice]}>{formatCurrency(item.price || 0)}</Text>
              <Text style={[styles.col, styles.colTotal]}>{formatCurrency((item.price || 0) * (item.quantity || 0))}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total do Pedido:</Text>
            <Text style={styles.totalValue}>{formatCurrency(order.total_amount || 0)}</Text>
          </View>
        </View>
      </View>

      {/* Remetente */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Remetente</Text>
        <Text style={styles.text}>GYMSTORE</Text>
        <Text style={styles.text}>contato@gymstore.com</Text>
        <Text style={styles.text}>(11) 99999-9999</Text>
      </View>

      {/* Assinatura */}
      <View style={styles.footer}>
        <View style={styles.signatureSection}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureText}>(Assinatura do Recebedor)</Text>
        </View>
      </View>
    </Page>
  </Document>
);