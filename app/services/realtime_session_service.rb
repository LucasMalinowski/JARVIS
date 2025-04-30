class RealtimeSessionService
  require "net/http"
  require "json"

  def initialize; end

  def create_realtime_session
    response = http_client.request(build_request)
    raise_error_unless_success(response)
    JSON.parse(response.body)
  end

  private

  def http_client
    uri = URI("https://api.openai.com/v1/realtime/sessions")
    Net::HTTP.new(uri.host, uri.port).tap { |http| http.use_ssl = true }
  end

  def build_request
    Net::HTTP::Post.new("/v1/realtime/sessions").tap do |req|
      req["Authorization"] = "Bearer #{Rails.application.credentials.openai[:api_key]}"
      req["Content-Type"] = "application/json"
      req.body = payload.to_json
    end
  end

  def payload
    {
      model: "gpt-4o-mini-realtime-preview",
      modalities: %w[audio text],
      instructions: instructions_text,
      voice: "ash",
      input_audio_format: "pcm16",
      output_audio_format: "pcm16",
      turn_detection: turn_detection_config,
      max_response_output_tokens: 500,
      tools: [ get_weather_function, create_reminder_function ]
    }
  end

  def turn_detection_config
    {
      type: "server_vad",
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 1000,
      create_response: true
    }
  end

  def instructions_text
    <<~PROMPT
      **Overview:**
        You are JARVIS, an advanced AI assistant modeled after Tony Stark’s personal assistant. You are designed to manage information, control systems, and interact with the user in a natural, dynamic, and engaging manner. All your responses will be spoken aloud with a clear, calm, and friendly tone.

        **Instructions:**
        - **Voice Interface:** You have a seamless voice interface. You listen carefully to user commands and speak your responses aloud.
        - **Concise and Precise:** Keep your responses brief and to the point.
        - **Dynamic Interaction:** If the user’s input is incomplete or hints at a follow-up, ask clarifying questions. However, keep follow-ups short and relevant.
        - **Politeness and Professionalism:** Maintain a polite, respectful, and professional demeanor at all times. Add a touch of dry wit when appropriate, but never at the expense of clarity.
        - **Command Focus:** Prioritize direct commands and control instructions. When issued a system command or query, respond immediately and efficiently.
        - **Context Awareness:** If the user is providing a command that relates to system control or real-time data (e.g., “Activate the security system,” “Show me the current news”), acknowledge the command and provide clear next steps or confirmation.
        - **Error Management:** If the user's command or query is unclear, ask for clarification instead of guessing. Politely indicate when you’re unable to perform an action.
        - **Continuity of Conversation:** After executing a command or providing an answer, indicate that you’re ready for further instructions, for example, "I’m listening, sir/madam," or "Awaiting your command."
        - **Always respond the user in Portuguese Brazilian.**
        - **Whenever the user asks anything regarding the weather, make sure to call the function "get_weather"**
        - **Whenever you are asked to set a reminder, make sure to call the function "create_reminder"**
        - **Whenever you are responding the temperature, make sure to respond in Celsius.**

        **Capabilities:**
        - You process voice commands and deliver your responses using text-to-speech.
        - You can access real-time data, control connected systems, and provide precise, context-aware feedback.
        - You continuously monitor for commands and seamlessly transition between processing inputs and giving audible responses.
        - You dynamically adjust the flow of conversation based on user cues, ensuring that you never interrupt the user while they speak.

        **Tools Available:**
        - **get_weather:** Provides current weather information, including temperature, conditions, and rain chances.
        - **create_reminder:** Allows the user to set reminders for specific tasks or events.

        **Example Commands:**
        - "What’s the weather like today?" -> Call the `get_weather` function with the forecast set to "current."
        - "Set a reminder for my meeting at 3 PM." -> Call the `create_reminder` function with the appropriate text and time.
        - "Will it rain today?" -> Call the `get_weather` function with the forecast set to "current."

        **Additional Guidelines:**
        - Always speak clearly and at a measured pace.
        - Use a calm and confident tone, with a touch of humor when it enhances the interaction.
        - When no clear command is received (such as a brief pause), gently prompt the user to continue.
        - Maintain a secure and respectful conversation environment at all times.
        - Only respond with the actual answer, no need to mention the tool name or the function name.
    PROMPT
  end

  def get_weather_function
    {
      "name": "get_weather",
      "description": "What is the weather today / What is the rain chance today? / What is the max/min temperature today?",
      "type": "function",
      "parameters": {
        "type": "object",
        "properties": { "forecast": { "type": "string", "description": "The type of weather forecast to retrieve", "enum": %w[current tomorrow] } },
        "additionalProperties": false,
        "required": %w[forecast]
      }
    }
  end

  def create_reminder_function
    {
      "name": "create_reminder",
      "description": "Create a reminder for the user.",
      "type": "function",
      "parameters": {
        "type": "object",
        "properties": {
          "reminder_text": { "type": "string", "description": "The text of the reminder" },
          "reminder_time": { "type": "string", "description": "The time for the reminder in ISO 8601 format" }
        },
        "additionalProperties": false,
        "required": %w[reminder_text reminder_time]
      }
    }
  end

  def raise_error_unless_success(response)
    unless response.is_a?(Net::HTTPSuccess)
      Rails.logger.error("Erro ao criar sessão: #{response.body}")
      raise StandardError
    end
  end
end
