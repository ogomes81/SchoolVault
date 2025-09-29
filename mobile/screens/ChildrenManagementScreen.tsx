import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import { apiClient } from '../lib/api';
import type { Child } from '../types/shared';

interface ChildrenManagementScreenProps {
  onGoBack: () => void;
}

export default function ChildrenManagementScreen({ onGoBack }: ChildrenManagementScreenProps) {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('');
  const [birthYear, setBirthYear] = useState('');

  const grades = [
    'Pre-K', 'Kindergarten', '1st Grade', '2nd Grade', '3rd Grade', 
    '4th Grade', '5th Grade', '6th Grade', '7th Grade', '8th Grade',
    '9th Grade', '10th Grade', '11th Grade', '12th Grade'
  ];

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      const result = await apiClient.getChildren();
      if (result.data) {
        setChildren(result.data);
      } else if (result.error) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      console.error('Error loading children:', error);
      Alert.alert('Error', 'Failed to load children');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (child: Child) => {
    setName(child.name);
    setGrade(child.grade);
    setBirthYear(child.birthYear?.toString() || '');
    setEditingChild(child);
    setShowAddModal(true);
  };

  const resetForm = () => {
    setName('');
    setGrade('');
    setBirthYear('');
    setEditingChild(null);
  };

  const closeModal = () => {
    setShowAddModal(false);
    resetForm();
  };

  const saveChild = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter the child\'s name');
      return;
    }

    if (!grade) {
      Alert.alert('Error', 'Please select a grade');
      return;
    }

    try {
      const childData = {
        name: name.trim(),
        grade,
        birthYear: birthYear ? parseInt(birthYear, 10) : undefined,
      };

      let result;
      if (editingChild) {
        result = await apiClient.updateChild(editingChild.id, childData);
      } else {
        result = await apiClient.createChild(childData);
      }

      if (result.error) {
        Alert.alert('Error', result.error);
      } else {
        closeModal();
        loadChildren(); // Refresh the list
        Alert.alert(
          'Success',
          editingChild ? 'Child updated successfully' : 'Child added successfully'
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save child');
    }
  };

  const deleteChild = (child: Child) => {
    Alert.alert(
      'Delete Child',
      `Are you sure you want to delete ${child.name}? All documents assigned to this child will be unassigned.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDeleteChild(child.id),
        },
      ]
    );
  };

  const confirmDeleteChild = async (childId: string) => {
    try {
      const result = await apiClient.deleteChild(childId);
      if (result.error) {
        Alert.alert('Error', result.error);
      } else {
        loadChildren(); // Refresh the list
        Alert.alert('Success', 'Child deleted successfully');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete child');
    }
  };

  const renderChild = ({ item }: { item: Child }) => (
    <View style={styles.childCard} testID={`card-child-${item.id}`}>
      <View style={styles.childInfo}>
        <Text style={styles.childName}>{item.name}</Text>
        <Text style={styles.childGrade}>{item.grade}</Text>
        {item.birthYear && (
          <Text style={styles.childBirthYear}>Born: {item.birthYear}</Text>
        )}
      </View>
      
      <View style={styles.childActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => openEditModal(item)}
          testID={`button-edit-${item.id}`}
        >
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteChild(item)}
          testID={`button-delete-${item.id}`}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderGradeSelector = () => (
    <View style={styles.gradeSelector}>
      <Text style={styles.label}>Grade *</Text>
      <View style={styles.gradeOptions}>
        {grades.map((gradeOption) => (
          <TouchableOpacity
            key={gradeOption}
            style={[
              styles.gradeButton,
              grade === gradeOption && styles.gradeButtonSelected,
            ]}
            onPress={() => setGrade(gradeOption)}
            testID={`button-grade-${gradeOption}`}
          >
            <Text
              style={[
                styles.gradeButtonText,
                grade === gradeOption && styles.gradeButtonTextSelected,
              ]}
            >
              {gradeOption}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading children...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onGoBack} testID="button-back">
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Children</Text>
        <TouchableOpacity onPress={openAddModal} testID="button-add-child">
          <Text style={styles.addButton}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {children.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No children added yet</Text>
            <Text style={styles.emptySubtext}>
              Add children to organize documents by grade level
            </Text>
            <TouchableOpacity
              style={styles.emptyAddButton}
              onPress={openAddModal}
              testID="button-add-first-child"
            >
              <Text style={styles.emptyAddButtonText}>Add Your First Child</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={children}
            renderItem={renderChild}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.childrenList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Add/Edit Child Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeModal} testID="button-cancel-child">
              <Text style={styles.modalCancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingChild ? 'Edit Child' : 'Add Child'}
            </Text>
            <TouchableOpacity onPress={saveChild} testID="button-save-child">
              <Text style={styles.modalSaveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter child's name"
                autoCapitalize="words"
                testID="input-child-name"
              />
            </View>

            {renderGradeSelector()}

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Birth Year (Optional)</Text>
              <TextInput
                style={styles.input}
                value={birthYear}
                onChangeText={setBirthYear}
                placeholder="e.g., 2015"
                keyboardType="numeric"
                maxLength={4}
                testID="input-birth-year"
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    color: '#2563eb',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  emptyAddButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  emptyAddButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  childrenList: {
    paddingBottom: 20,
  },
  childCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  childGrade: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  childBirthYear: {
    fontSize: 12,
    color: '#9ca3af',
  },
  childActions: {
    flexDirection: 'row',
  },
  editButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  editButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalCancelButton: {
    color: '#6b7280',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalSaveButton: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  gradeSelector: {
    marginBottom: 24,
  },
  gradeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  gradeButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  gradeButtonSelected: {
    backgroundColor: '#2563eb',
  },
  gradeButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '500',
  },
  gradeButtonTextSelected: {
    color: 'white',
  },
});