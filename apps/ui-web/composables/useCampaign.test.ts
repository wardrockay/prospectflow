import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ref } from 'vue';
import { useCampaign } from './useCampaign';
import type { Campaign } from './useCampaign';

// Import setup to get globalThis type declarations
import '../tests/setup';

describe('useCampaign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockCampaign: Campaign = {
    id: 'test-uuid',
    organisation_id: 'org-uuid',
    name: 'Test Campaign',
    valueProp: 'Our value proposition',
    status: 'active',
    created_at: '2026-01-14T10:00:00Z',
    updated_at: '2026-01-14T10:00:00Z',
    prospect_count: 42,
    emails_sent: 20,
  };

  it('should fetch a single campaign by ID', () => {
    globalThis.useFetch.mockReturnValue({
      data: ref(mockCampaign),
      pending: ref(false),
      error: ref(null),
      refresh: vi.fn(),
    });

    const { campaign, pending, error } = useCampaign('test-uuid');

    expect(campaign.value).toEqual(mockCampaign);
    expect(pending.value).toBe(false);
    expect(error.value).toBeNull();
  });

  it('should call useFetch with correct endpoint and options', () => {
    globalThis.useFetch.mockReturnValue({
      data: ref(mockCampaign),
      pending: ref(false),
      error: ref(null),
      refresh: vi.fn(),
    });

    useCampaign('campaign-123');

    expect(globalThis.useFetch).toHaveBeenCalledWith(
      '/api/campaigns/campaign-123',
      expect.objectContaining({
        credentials: 'include',
        watch: false,
        key: 'campaign-campaign-123',
      })
    );
  });

  it('should return null campaign when data is null', () => {
    globalThis.useFetch.mockReturnValue({
      data: ref(null),
      pending: ref(false),
      error: ref(null),
      refresh: vi.fn(),
    });

    const { campaign } = useCampaign('non-existent');

    expect(campaign.value).toBeNull();
  });

  it('should handle 404 errors gracefully', () => {
    const mockError = { statusCode: 404, message: 'Campaign not found' };

    globalThis.useFetch.mockReturnValue({
      data: ref(null),
      pending: ref(false),
      error: ref(mockError),
      refresh: vi.fn(),
    });

    const { campaign, error } = useCampaign('non-existent');

    expect(campaign.value).toBeNull();
    expect(error.value).toEqual(mockError);
  });

  it('should handle 401 unauthorized errors', () => {
    const mockError = { statusCode: 401, message: 'Non authentifié' };

    globalThis.useFetch.mockReturnValue({
      data: ref(null),
      pending: ref(false),
      error: ref(mockError),
      refresh: vi.fn(),
    });

    const { error } = useCampaign('test-uuid');

    expect(error.value).toEqual(mockError);
  });

  it('should handle 500 server errors', () => {
    const mockError = { statusCode: 500, message: 'Erreur serveur' };

    globalThis.useFetch.mockReturnValue({
      data: ref(null),
      pending: ref(false),
      error: ref(mockError),
      refresh: vi.fn(),
    });

    const { error } = useCampaign('test-uuid');

    expect(error.value).toEqual(mockError);
  });

  it('should show pending state during fetch', () => {
    globalThis.useFetch.mockReturnValue({
      data: ref(null),
      pending: ref(true),
      error: ref(null),
      refresh: vi.fn(),
    });

    const { pending } = useCampaign('test-uuid');

    expect(pending.value).toBe(true);
  });

  it('should provide refresh function', () => {
    const mockRefresh = vi.fn();

    globalThis.useFetch.mockReturnValue({
      data: ref(mockCampaign),
      pending: ref(false),
      error: ref(null),
      refresh: mockRefresh,
    });

    const { refresh } = useCampaign('test-uuid');

    expect(refresh).toBe(mockRefresh);
  });

  it('should handle campaign with null valueProp', () => {
    const campaignNoValueProp: Campaign = {
      ...mockCampaign,
      valueProp: null,
    };

    globalThis.useFetch.mockReturnValue({
      data: ref(campaignNoValueProp),
      pending: ref(false),
      error: ref(null),
      refresh: vi.fn(),
    });

    const { campaign } = useCampaign('test-uuid');

    expect(campaign.value?.valueProp).toBeNull();
  });

  it('should handle campaign without emails_sent field', () => {
    const campaignNoEmails: Campaign = {
      id: 'test-uuid',
      organisation_id: 'org-uuid',
      name: 'Test Campaign',
      valueProp: null,
      status: 'draft',
      created_at: '2026-01-14T10:00:00Z',
      updated_at: '2026-01-14T10:00:00Z',
      prospect_count: 0,
    };

    globalThis.useFetch.mockReturnValue({
      data: ref(campaignNoEmails),
      pending: ref(false),
      error: ref(null),
      refresh: vi.fn(),
    });

    const { campaign } = useCampaign('test-uuid');

    expect(campaign.value?.emails_sent).toBeUndefined();
  });

  it('should handle all campaign statuses', () => {
    const statuses: Campaign['status'][] = ['draft', 'active', 'paused', 'completed', 'archived'];

    statuses.forEach((status) => {
      const campaignWithStatus: Campaign = { ...mockCampaign, status };

      globalThis.useFetch.mockReturnValue({
        data: ref(campaignWithStatus),
        pending: ref(false),
        error: ref(null),
        refresh: vi.fn(),
      });

      const { campaign } = useCampaign('test-uuid');

      expect(campaign.value?.status).toBe(status);
    });
  });

  it('should use unique cache key per campaign ID', () => {
    globalThis.useFetch.mockReturnValue({
      data: ref(mockCampaign),
      pending: ref(false),
      error: ref(null),
      refresh: vi.fn(),
    });

    useCampaign('uuid-1');
    useCampaign('uuid-2');

    expect(globalThis.useFetch).toHaveBeenCalledWith(
      '/api/campaigns/uuid-1',
      expect.objectContaining({ key: 'campaign-uuid-1' })
    );
    expect(globalThis.useFetch).toHaveBeenCalledWith(
      '/api/campaigns/uuid-2',
      expect.objectContaining({ key: 'campaign-uuid-2' })
    );
  });
});
