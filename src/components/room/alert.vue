<template>
  <v-card>
    <v-alert type="warning" color="transparent" class="mb-0">
      <template v-slot:close>
        <v-btn icon small color="main_color" @click="$emit('close')">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </template>
      <span>{{ text }}</span>
    </v-alert>

    <div class="pb-2">
      <v-divider class="main_color"></v-divider>
    </div>

    <v-card-actions class="justify-end">
      <v-btn color="accent_color" text @click="$emit('confirm')">
        {{ $t('mafia.confirm') }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
export default {
  props: {
    text: {
      type: String,
      default: ''
    }
  }
}
</script>
