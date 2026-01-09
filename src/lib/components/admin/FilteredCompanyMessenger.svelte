<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import { enhance, deserialize } from "$app/forms";
  import { Eye, Send, Building2 } from "lucide-svelte";

  interface Props {
    companyIds: string[];
    companyCount: number;
  }

  interface PreviewRecipient {
    name: string;
    email: string;
    role: string; // 'Host' or 'Contact'
  }

  interface FormResult {
    success?: boolean;
    message?: string;
    count?: number;
    preview?: PreviewRecipient[];
  }

  let { companyIds, companyCount }: Props = $props();

  let subject = $state("");
  let message = $state("");
  let previewData = $state<FormResult | null>(null);
  let sendResult = $state<FormResult | null>(null);
  let isSubmitting = $state(false);

  // Reset preview when changing company selection
  $effect(() => {
    void companyCount;
    subject = "";
    message = "";
    previewData = null;
    sendResult = null;
  });

  async function handlePreview(formElement: HTMLFormElement) {
    const formData = new FormData(formElement);

    try {
      const response = await fetch("?/previewFilteredCompanies", {
        method: "POST",
        body: formData,
      });

      const result = deserialize(await response.text());

      if (result.type === "success" && result.data) {
        previewData = result.data as FormResult;
      } else if (result.type === "failure") {
        const failureData = result.data as { message?: string };
        previewData = {
          success: false,
          message: failureData?.message || "Preview failed",
        };
      }
    } catch (error) {
      console.error("Preview error:", error);
      previewData = { success: false, message: "Failed to load preview" };
    }
  }

  function handleSendSuccess(result: { data?: FormResult }) {
    if (result.data) {
      sendResult = result.data;
      // Clear form on success
      if (result.data.success) {
        subject = "";
        message = "";
        previewData = null;
      }
    }
    isSubmitting = false;
  }
</script>

<div class="space-y-4">
  <!-- Summary -->
  <div class="flex items-center gap-2 text-sm text-gray-600">
    <Building2 class="h-4 w-4" />
    <span class="font-medium"
      >{companyCount} company{companyCount !== 1 ? "ies" : ""} selected</span
    >
  </div>

  <form
    method="POST"
    action="?/sendToFilteredCompanies"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ result }) => {
        handleSendSuccess(result as { data?: FormResult });
      };
    }}
  >
    <!-- Hidden field with company IDs -->
    <input type="hidden" name="companyIds" value={JSON.stringify(companyIds)} />

    <div class="p-3 bg-blue-50 rounded-md text-xs mb-4">
      <p class="font-medium text-blue-800">Recipients:</p>
      <p class="text-blue-700 mt-1">
        Messages will be sent to all <strong>account owners (hosts)</strong> and
        <strong>position contacts</strong> for the selected companies.
      </p>
      <p class="text-blue-600 mt-1 italic">
        (Automatically deduplicated if the same email appears multiple times)
      </p>
    </div>

    <!-- Subject Field -->
    <div class="mb-4">
      <Label for="company-subject">Subject</Label>
      <Input
        id="company-subject"
        name="subject"
        bind:value={subject}
        placeholder="Email subject..."
        required
      />
    </div>

    <!-- Message Field -->
    <div class="mb-4">
      <Label for="company-message">Message</Label>
      <Textarea
        id="company-message"
        name="message"
        bind:value={message}
        placeholder="Email message..."
        rows={8}
        required
      />
    </div>

    <!-- Action Buttons -->
    <div class="flex gap-2">
      <Button
        type="button"
        variant="outline"
        onclick={(e: MouseEvent) => {
          const form = (e.currentTarget as HTMLElement).closest("form");
          if (form) {
            handlePreview(form);
          }
        }}
        disabled={isSubmitting}
      >
        <Eye class="h-4 w-4 mr-2" />
        Preview Recipients
      </Button>

      <Button type="submit" disabled={isSubmitting || !message.trim()}>
        <Send class="h-4 w-4 mr-2" />
        {isSubmitting ? "Sending..." : "Send Email"}
      </Button>
    </div>
  </form>

  <!-- Preview Results -->
  {#if previewData}
    <div
      class="mt-4 p-4 border rounded-lg {previewData.success === false
        ? 'bg-red-50 border-red-200'
        : 'bg-blue-50 border-blue-200'}"
    >
      {#if previewData.success === false}
        <p class="text-sm text-red-700 font-medium">
          {previewData.message || "Preview failed"}
        </p>
      {:else if previewData.preview}
        <div class="space-y-2">
          <p class="text-sm font-medium text-blue-900">
            Preview: {previewData.count || previewData.preview.length} recipient{(previewData.count ||
              previewData.preview.length) !== 1
              ? "s"
              : ""} across {companyCount} companies
          </p>
          <div class="max-h-48 overflow-y-auto space-y-1">
            {#each previewData.preview as recipient}
              <div class="text-sm text-blue-800">
                <span class="font-medium">{recipient.name}</span>
                <span class="text-gray-500 text-xs ml-1"
                  >({recipient.role})</span
                >
                <span class="text-blue-600"> - {recipient.email}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Send Results -->
  {#if sendResult}
    <div
      class="mt-4 p-4 border rounded-lg {sendResult.success
        ? 'bg-green-50 border-green-200'
        : 'bg-red-50 border-red-200'}"
    >
      {#if sendResult.success}
        <p class="text-sm text-green-700 font-medium">
          ✓ Successfully sent emails to {sendResult.count} deduplicated recipient{sendResult.count !==
          1
            ? "s"
            : ""}.
        </p>
      {:else}
        <p class="text-sm text-red-700 font-medium">
          {sendResult.message || "Failed to send messages"}
        </p>
      {/if}
    </div>
  {/if}
</div>
