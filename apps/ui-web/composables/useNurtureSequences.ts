export const useNurtureSequences = () => {
  const config = useRuntimeConfig();
  const ingestApiUrl = config.public.ingestApiUrl || 'http://localhost:4000';

  const {
    data: sequences,
    pending: loading,
    error,
    refresh
  } = useFetch(`${ingestApiUrl}/admin/nurture-sequences`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  const deleteSequence = async (id: string) => {
    try {
      await $fetch(`${ingestApiUrl}/admin/nurture-sequences/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      await refresh();
    } catch (err) {
      console.error('Failed to delete nurture sequence:', err);
      throw err;
    }
  };

  return {
    sequences,
    loading,
    error,
    refresh,
    deleteSequence
  };
};

export const useNurtureSequence = (id: Ref<string>) => {
  const config = useRuntimeConfig();
  const ingestApiUrl = config.public.ingestApiUrl || 'http://localhost:4000';

  const {
    data: sequence,
    pending: loading,
    error,
    refresh
  } = useFetch(() => `${ingestApiUrl}/admin/nurture-sequences/${id.value}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    watch: [id]
  });

  return {
    sequence,
    loading,
    error,
    refresh
  };
};
