<!-- Werdykt i przycisk „Dalej" — te same trzy linijki w czterech ćwiczeniach. -->
<script lang="ts">
  type Props = { correct: boolean; text: string; onnext: () => void };
  let { correct, text, onnext }: Props = $props();
</script>

<div class="verdict" class:ok={correct} class:no={!correct}>{text}</div>
<button class="btn nextq" data-test="next" onclick={onnext}>Dalej <small>spacja</small></button>
