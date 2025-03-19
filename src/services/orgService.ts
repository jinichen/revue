/**
 * Organization service for organization data
 */

import { get } from '@/lib/api';
import { Organization } from '@/types';

/**
 * Get all organizations
 */
export async function getAllOrganizations() {
  return get<Organization[]>('/api/organizations');
}

/**
 * Get organization by ID
 */
export async function getOrganizationById(orgId: string) {
  return get<Organization>(`/api/organizations/${orgId}`);
} 