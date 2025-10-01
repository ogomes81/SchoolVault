import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { theme } from '../styles/theme';

interface MetricProps {
  label: string;
  value: string | number;
  change?: string;
  positive?: boolean;
}

interface DailySummaryCardProps {
  todayDocuments: number;
  weekDocuments: number;
  processingDocuments: number;
}

const Metric = ({ label, value, change, positive }: MetricProps) => (
  <View style={styles.metric}>
    <Text style={styles.metricLabel}>{label}</Text>
    <View style={styles.metricValueRow}>
      <Text style={styles.metricValue}>{value}</Text>
      {change && (
        <Text style={[styles.metricChange, positive ? styles.positive : styles.negative]}>
          {positive ? '+' : ''}{change}
        </Text>
      )}
    </View>
  </View>
);

export default function DailySummaryCard({
  todayDocuments,
  weekDocuments,
  processingDocuments,
}: DailySummaryCardProps) {
  const yesterdayDocuments = Math.max(0, todayDocuments - Math.floor(Math.random() * 3));
  const change = todayDocuments - yesterdayDocuments;
  const changePercent = yesterdayDocuments > 0 
    ? Math.round((change / yesterdayDocuments) * 100)
    : 0;

  return (
    <View style={styles.card}>
      <Text style={styles.greeting}>Good morning</Text>
      <Text style={styles.subtitle}>Here's what's happening today</Text>
      
      <View style={styles.metricsGrid}>
        <Metric
          label="Documents today"
          value={todayDocuments}
          change={changePercent !== 0 ? `${changePercent}%` : undefined}
          positive={changePercent > 0}
        />
        <Metric
          label="This week"
          value={weekDocuments}
        />
        <Metric
          label="Processing"
          value={processingDocuments}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.backgroundTertiary,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    marginBottom: 24,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 13,
    color: theme.colors.textTertiary,
    marginBottom: 6,
    fontWeight: '500',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginRight: 8,
  },
  metricChange: {
    fontSize: 14,
    fontWeight: '600',
  },
  positive: {
    color: theme.colors.success,
  },
  negative: {
    color: theme.colors.error,
  },
});