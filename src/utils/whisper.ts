export type WhisperMode = 'default' | 'fast' | 'accurate';

export type TranscriptionStatus = 'transcribing' | 'error' | 'complete';

export interface TranscriptionResponse {
  text: string;
  error?: string;
}

export interface TranscriptionError {
  error: string;
  code?: string;
}

export async function transcribeWithWhisper(
  audioBlob: Blob, 
  onStatusChange?: (status: TranscriptionStatus) => void
): Promise<string> {
  const formData = new FormData();
  const fileName = `recording_${Date.now()}.webm`;
  const file = new File([audioBlob], fileName, { type: audioBlob.type });
  
  formData.append('audio', file);
  
  const whisperMode = (window.localStorage.getItem('whisperMode') || 'default') as WhisperMode;
  formData.append('mode', whisperMode);

  try {
    // Start with transcribing state
    if (onStatusChange) {
      onStatusChange('transcribing');
    }

    const response = await fetch('/api/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData: TranscriptionError = await response.json().catch(() => ({
        error: `Transcription error: ${response.status} ${response.statusText}`
      }));
      throw new Error(
        errorData.error || 
        `Transcription error: ${response.status} ${response.statusText}`
      );
    }

    const data: TranscriptionResponse = await response.json();
    
    if (onStatusChange) {
      onStatusChange('complete');
    }
    
    return data.text || '';
  } catch (error) {
    if (onStatusChange) {
      onStatusChange('error');
    }
    
    if (error instanceof Error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Cannot connect to server. Please ensure the backend is running.');
      }
      throw error;
    }
    
    throw new Error('Unknown error occurred during transcription');
  }
}