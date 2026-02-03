export const useEmailTemplates = () => {
  const config = useRuntimeConfig();
  const ingestApiUrl = config.public.ingestApiUrl || 'http://localhost:4000';

  const {
    data: templates,
    pending: loading,
    error,
    refresh
  } = useFetch(`${ingestApiUrl}/admin/email-templates`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const deleteTemplate = async (id: string) => {
    try {
      await $fetch(`${ingestApiUrl}/admin/email-templates/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      await refresh();
    } catch (err) {
      console.error('Failed to delete email template:', err);
      throw err;
    }
  };

  const previewTemplate = async (htmlBody: string, sampleData?: any) => {
    try {
      const response = await $fetch<{ success: boolean; data: { preview_html: string } }>(
        `${ingestApiUrl}/admin/email-templates/preview`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: {
            html_body: htmlBody,
            sample_data: sampleData
          }
        }
      );
      return response.data.preview_html;
    } catch (err) {
      console.error('Failed to preview email template:', err);
      throw err;
    }
  };

  return {
    templates,
    loading,
    error,
    refresh,
    deleteTemplate,
    previewTemplate
  };
};

export const useEmailTemplate = (id: Ref<string>) => {
  const config = useRuntimeConfig();
  const ingestApiUrl = config.public.ingestApiUrl || 'http://localhost:4000';

  const {
    data: template,
    pending: loading,
    error,
    refresh
  } = useFetch(() => `${ingestApiUrl}/admin/email-templates/${id.value}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    watch: [id]
  });

  return {
    template,
    loading,
    error,
    refresh
  };
};
