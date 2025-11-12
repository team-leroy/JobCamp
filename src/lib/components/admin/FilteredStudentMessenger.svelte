<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { Label } from "$lib/components/ui/label";
  import { Textarea } from "$lib/components/ui/textarea";
  import { enhance } from "$app/forms";
  import { Mail, MessageSquare, Eye, Users, Send } from "lucide-svelte";

  interface Props {
    studentIds: string[];
    studentCount: number;
  }

  interface PreviewRecipient {
    name: string;
    email?: string;
    phone?: string;
  }

  interface FormResult {
    success?: boolean;
    message?: string;
    count?: number;
    preview?: PreviewRecipient[];
  }

  let { studentIds, studentCount }: Props = $props();

  let messageType = $state<"email" | "sms">("email");
  let includeParents = $state(false);
  let subject = $state("");
  let message = $state("");
  let previewData = $state<FormResult | null>(null);
  let sendResult = $state<FormResult | null>(null);
  let isSubmitting = $state(false);

  // Reset preview when changing message type or parent toggle
  $effect(() => {
    void messageType;
    void includeParents;
    previewData = null;
  });

  // Reset everything when student count changes
  $effect(() => {
    void studentCount;
    subject = "";
    message = "";
    previewData = null;
    sendResult = null;
  });

  async function handlePreview(formElement: HTMLFormElement) {
    const formData = new FormData(formElement);

    try {
      const response = await fetch("?/previewFilteredStudents", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.type === "success" && result.data) {
        previewData = result.data;
      } else if (result.type === "failure") {
        previewData = {
          success: false,
          message: result.data?.message || "Preview failed",
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
    <Users class="h-4 w-4" />
    <span class="font-medium"
      >{studentCount} student{studentCount !== 1 ? "s" : ""} selected</span
    >
  </div>

  <form
    method="POST"
    action="?/sendToFilteredStudents"
    use:enhance={() => {
      isSubmitting = true;
      return async ({ result }) => {
        handleSendSuccess(result as { data?: FormResult });
      };
    }}
  >
    <!-- Hidden field with student IDs -->
    <input type="hidden" name="studentIds" value={JSON.stringify(studentIds)} />

    <!-- Message Type Toggle -->
    <div class="flex gap-4 mb-4">
      <Label class="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="messageType"
          value="email"
          bind:group={messageType}
          class="cursor-pointer"
        />
        <Mail class="h-4 w-4" />
        Email
      </Label>
      <Label class="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name="messageType"
          value="sms"
          bind:group={messageType}
          class="cursor-pointer"
        />
        <MessageSquare class="h-4 w-4" />
        SMS
      </Label>
    </div>

    {#if messageType === "email"}
      <!-- Include Parents Checkbox -->
      <div class="mb-4">
        <Label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            name="includeParents"
            bind:checked={includeParents}
            class="cursor-pointer"
          />
          Include parent emails
        </Label>
      </div>

      <!-- Subject Field -->
      <div class="mb-4">
        <Label for="subject">Subject</Label>
        <Input
          id="subject"
          name="subject"
          bind:value={subject}
          placeholder="Email subject..."
          required
        />
      </div>
    {/if}

    <!-- Message Field -->
    <div class="mb-4">
      <Label for="message">
        {messageType === "email" ? "Message" : "SMS Message"}
      </Label>
      <Textarea
        id="message"
        name="message"
        bind:value={message}
        placeholder={messageType === "email"
          ? "Email message..."
          : "SMS message (160 characters max recommended)..."}
        rows={6}
        required
      />
      {#if messageType === "sms"}
        <p class="text-sm text-gray-500 mt-1">
          Character count: {message.length}
        </p>
      {/if}
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
        {isSubmitting
          ? "Sending..."
          : `Send ${messageType === "email" ? "Email" : "SMS"}`}
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
              : ""}
          </p>
          <div class="max-h-48 overflow-y-auto space-y-1">
            {#each previewData.preview as recipient}
              <div class="text-sm text-blue-800">
                <span class="font-medium">{recipient.name}</span>
                {#if messageType === "email" && recipient.email}
                  <span class="text-blue-600"> - {recipient.email}</span>
                {/if}
                {#if messageType === "sms" && recipient.phone}
                  <span class="text-blue-600"> - {recipient.phone}</span>
                {/if}
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
          ✓ Successfully sent {messageType === "email"
            ? "emails"
            : "SMS messages"} to {sendResult.count} recipient{sendResult.count !==
          1
            ? "s"
            : ""}
        </p>
      {:else}
        <p class="text-sm text-red-700 font-medium">
          {sendResult.message || "Failed to send messages"}
        </p>
      {/if}
    </div>
  {/if}
</div>
