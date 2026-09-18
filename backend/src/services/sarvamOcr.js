// server/services/sarvamOcr.js

import { SarvamAIClient } from 'sarvamai';

const TERMINAL_STATES = new Set([
  'completed',
  'partially_completed',
  'failed',
  'rejected',
]);

/**
 * Wait until Sarvam Document AI finishes processing.
 */
async function waitForDocumentJob(client, jobId) {
  const maxAttempts = 60;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const status = await client.docAi.getStatus(jobId);

    const currentStatus = String(
      status?.status || ''
    ).toLowerCase();

    console.log(
      `Sarvam Document AI status: ${currentStatus} (${attempt}/${maxAttempts})`
    );

    if (TERMINAL_STATES.has(currentStatus)) {
      return status;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 5000);
    });
  }

  throw new Error(
    'Sarvam Document AI processing timed out after 5 minutes.'
  );
}

/**
 * Extract text from Sarvam Document AI result.
 *
 * The result may contain the digitized document
 * as a string, pages, blocks, or nested result data.
 */
function extractDigitizedText(result) {
  if (!result) {
    return '';
  }

  if (typeof result === 'string') {
    return result.trim();
  }

  if (typeof result.result === 'string') {
    return result.result.trim();
  }

  if (typeof result.content === 'string') {
    return result.content.trim();
  }

  if (typeof result.text === 'string') {
    return result.text.trim();
  }

  if (Array.isArray(result.blocks)) {
    return result.blocks
      .map((block) => {
        if (typeof block === 'string') {
          return block;
        }

        return (
          block?.text ||
          block?.content ||
          ''
        );
      })
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  if (Array.isArray(result.pages)) {
    return result.pages
      .map((page) => {
        if (typeof page === 'string') {
          return page;
        }

        return (
          page?.text ||
          page?.content ||
          ''
        );
      })
      .filter(Boolean)
      .join('\n')
      .trim();
  }

  // Some SDK responses may contain the actual
  // result inside a nested object.
  if (result.result && typeof result.result === 'object') {
    return extractDigitizedText(result.result);
  }

  return '';
}

/**
 * Digitize a real handwritten prescription/document.
 *
 * imageBuffer:
 *   Actual image received from the browser camera/file upload.
 *
 * apiKey:
 *   Optional API key supplied by the request.
 *   Server environment variable is preferred.
 *
 * language:
 *   BCP-47 language code such as:
 *   en-IN, hi-IN, ta-IN, te-IN, kn-IN, etc.
 */
export async function digitizeHandwrittenDocument({
  imageBuffer,
  apiKey,
  language = 'en-IN',
}) {
  // --------------------------------------------------
  // VALIDATE IMAGE
  // --------------------------------------------------

  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) {
    return {
      success: false,
      provider: 'Sarvam Document AI',
      error: 'No valid prescription image was received.',
    };
  }

  if (imageBuffer.length === 0) {
    return {
      success: false,
      provider: 'Sarvam Document AI',
      error: 'The prescription image is empty.',
    };
  }

  console.log(
    `Received real prescription image: ${imageBuffer.length} bytes`
  );

  // --------------------------------------------------
  // GET SARVAM API KEY
  // --------------------------------------------------

  const sarvamKey =
    apiKey || process.env.SARVAM_API_KEY;

  if (!sarvamKey) {
    return {
      success: false,
      provider: 'Sarvam Document AI',
      error:
        'SARVAM_API_KEY is not configured on the server.',
    };
  }

  try {
    // ------------------------------------------------
    // CREATE SARVAM CLIENT
    // ------------------------------------------------

    const client = new SarvamAIClient({
      apiSubscriptionKey: sarvamKey,
    });

    // ------------------------------------------------
    // PREPARE REAL IMAGE
    // ------------------------------------------------

    const documentFile = {
      data: imageBuffer,
      filename: `prescription-${Date.now()}.jpg`,
      contentType: 'image/jpeg',
      contentLength: imageBuffer.length,
    };

    // ------------------------------------------------
    // CREATE DOCUMENT AI JOB
    // ------------------------------------------------

    console.log(
      'Sending REAL prescription image to Sarvam Document AI...'
    );

    const job = await client.docAi.digitise({
      file: [documentFile],
      language,
      output_format: 'md',
    });

    if (!job?.job_id) {
      throw new Error(
        'Sarvam did not return a document job ID.'
      );
    }

    console.log(
      `Sarvam Document AI job created: ${job.job_id}`
    );

    // ------------------------------------------------
    // WAIT FOR PROCESSING
    // ------------------------------------------------

    const finalStatus =
      await waitForDocumentJob(
        client,
        job.job_id
      );

    const finalState = String(
      finalStatus?.status || ''
    ).toLowerCase();

    console.log(
      `Sarvam final status: ${finalState}`
    );

    // ------------------------------------------------
    // HANDLE FAILED JOB
    // ------------------------------------------------

    if (
      finalState === 'failed' ||
      finalState === 'rejected'
    ) {
      const message =
        finalStatus?.error?.message ||
        finalStatus?.error_message ||
        `Sarvam document processing ${finalState}.`;

      throw new Error(message);
    }

    // ------------------------------------------------
    // GET ACTUAL SARVAM RESULT
    // ------------------------------------------------

    const results =
      await client.docAi.getResults(
        job.job_id
      );

    console.log(
      'Sarvam Document AI result received.'
    );

    // ------------------------------------------------
    // EXTRACT ACTUAL TEXT
    // ------------------------------------------------

    const rawText =
      extractDigitizedText(results);

    if (!rawText) {
      console.error(
        'Sarvam completed processing but no text was found.',
        results
      );

      throw new Error(
        'Sarvam completed the document but returned no digitized text.'
      );
    }

    // ------------------------------------------------
    // RETURN REAL RESULT
    // ------------------------------------------------

    return {
      success: true,

      provider:
        'Sarvam AI Document AI / Sarvam Vision',

      digitizedData: {
        rawText,

        language,

        outputFormat: 'md',

        source:
          'Sarvam Document AI',

        jobId: job.job_id,

        status: finalState,

        usage:
          finalStatus?.usage || null,
      },
    };
  } catch (error) {
    console.error(
      'Sarvam Document AI OCR Error:',
      error
    );

    // ------------------------------------------------
    // EXTRACT USEFUL ERROR INFORMATION
    // ------------------------------------------------

    const statusCode =
      error?.statusCode ||
      error?.status ||
      null;

    let errorMessage =
      error?.message ||
      'Sarvam document digitization failed.';

    if (error?.body?.error?.message) {
      errorMessage =
        error.body.error.message;
    } else if (error?.body?.message) {
      errorMessage =
        error.body.message;
    }

    return {
      success: false,

      provider:
        'Sarvam Document AI',

      error: errorMessage,

      statusCode,
    };
  }
}