import { useEffect, useRef, useState } from 'react'
import {
  endMeeting,
  getMeetingParticipants,
  leaveMeeting,
  markParticipantPresent,
  startMeeting,
  subscribeToMeeting,
  subscribeToParticipants,
} from '../lib/roomService'

function MeetingRoom({
  meeting: initialMeeting,
  session,
  onExit,
}) {
  const [meeting, setMeeting] = useState(initialMeeting)
  const [participants, setParticipants] = useState([])
  const [loadingParticipants, setLoadingParticipants] = useState(true)

  const [microphoneEnabled, setMicrophoneEnabled] = useState(true)
  const [cameraEnabled, setCameraEnabled] = useState(true)

  const [mediaError, setMediaError] = useState('')
  const [roomError, setRoomError] = useState('')

  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const isHost = meeting.host_id === session.user.id

  async function loadParticipants() {
    try {
      const data = await getMeetingParticipants(meeting.id)
      setParticipants(data)
    } catch (error) {
      setRoomError(error.message)
    } finally {
      setLoadingParticipants(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function initializeRoom() {
      try {
        await markParticipantPresent(
          meeting.id,
          session.user.id
        )

        if (isHost && meeting.status === 'scheduled') {
          await startMeeting(meeting.id)

          if (!cancelled) {
            setMeeting((current) => ({
              ...current,
              status: 'live',
              started_at: new Date().toISOString(),
            }))
          }
        }

        await loadParticipants()
      } catch (error) {
        if (!cancelled) {
          setRoomError(error.message)
        }
      }
    }

    initializeRoom()

    const unsubscribeParticipants =
      subscribeToParticipants(meeting.id, () => {
        loadParticipants()
      })

    const unsubscribeMeeting =
      subscribeToMeeting(meeting.id, (payload) => {
        const updatedMeeting = payload.new

        setMeeting((current) => ({
          ...current,
          ...updatedMeeting,
        }))

        if (updatedMeeting.status === 'ended') {
          stopMedia()
        }
      })

    return () => {
      cancelled = true
      unsubscribeParticipants()
      unsubscribeMeeting()
    }
  }, [meeting.id])

  useEffect(() => {
    async function enableMedia() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMediaError(
          'Your browser does not support camera and microphone access.'
        )
        return
      }

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          })

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
      } catch {
        setCameraEnabled(false)
        setMicrophoneEnabled(false)

        setMediaError(
          'Camera or microphone permission was denied. You can still stay in the meeting.'
        )
      }
    }

    enableMedia()

    return () => {
      stopMedia()
    }
  }, [])

  useEffect(() => {
    const startedAt =
      meeting.started_at
        ? new Date(meeting.started_at).getTime()
        : Date.now()

    function updateTimer() {
      const difference = Math.max(
        0,
        Math.floor((Date.now() - startedAt) / 1000)
      )

      setElapsedSeconds(difference)
    }

    updateTimer()

    const timer = setInterval(updateTimer, 1000)

    return () => clearInterval(timer)
  }, [meeting.started_at])

  function stopMedia() {
    if (!streamRef.current) return

    streamRef.current
      .getTracks()
      .forEach((track) => track.stop())

    streamRef.current = null
  }

  function toggleMicrophone() {
    const stream = streamRef.current

    if (!stream) return

    stream.getAudioTracks().forEach((track) => {
      track.enabled = !microphoneEnabled
    })

    setMicrophoneEnabled((current) => !current)
  }

  function toggleCamera() {
    const stream = streamRef.current

    if (!stream) return

    stream.getVideoTracks().forEach((track) => {
      track.enabled = !cameraEnabled
    })

    setCameraEnabled((current) => !current)
  }

  async function handleLeave() {
    try {
      await leaveMeeting(
        meeting.id,
        session.user.id
      )
    } catch (error) {
      console.error(error)
    }

    stopMedia()
    onExit()
  }

  async function handleEndMeeting() {
    try {
      await endMeeting(meeting.id)
      stopMedia()
      onExit()
    } catch (error) {
      setRoomError(error.message)
    }
  }

  function formatTime(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600)

    const minutes = Math.floor(
      (totalSeconds % 3600) / 60
    )

    const seconds = totalSeconds % 60

    return [hours, minutes, seconds]
      .map((value) =>
        String(value).padStart(2, '0')
      )
      .join(':')
  }

  if (meeting.status === 'ended') {
    return (
      <main className="meeting-ended-page">
        <div className="meeting-ended-card">
          <p className="eyebrow">MEETING ENDED</p>

          <h1>{meeting.title}</h1>

          <p>
            This meeting has ended. The Memory Firewall review
            will be connected here later.
          </p>

          <button
            className="primary-button"
            onClick={onExit}
          >
            Return to workspace
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="meeting-room">
      <header className="room-header">
        <div className="room-heading">
          <div className="live-indicator">
            <span />
            LIVE
          </div>

          <div>
            <h1>{meeting.title}</h1>

            <p>
              {meeting.meeting_code}
              {' · '}
              {meeting.memory_mode} memory
            </p>
          </div>
        </div>

        <div className="meeting-timer">
          {formatTime(elapsedSeconds)}
        </div>
      </header>

      {roomError && (
        <div className="room-alert room-alert-error">
          {roomError}
        </div>
      )}

      {mediaError && (
        <div className="room-alert">
          {mediaError}
        </div>
      )}

      <div className="meeting-layout">
        <section className="video-area">
          <div className="local-video-card">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={
                cameraEnabled
                  ? 'local-video'
                  : 'local-video local-video-hidden'
              }
            />

            {!cameraEnabled && (
              <div className="camera-off-state">
                <div className="avatar-circle">
                  {session.user.email
                    ?.charAt(0)
                    .toUpperCase()}
                </div>

                <p>Camera off</p>
              </div>
            )}

            <div className="video-name">
              You {isHost ? '· Host' : ''}
            </div>
          </div>

          <div className="intelligence-placeholder">
            <div>
              <p className="eyebrow">
                INTELLIGENCE LAYER
              </p>

              <h2>
                Live meeting intelligence
              </h2>

              <p>
                Transcript, questions, decisions,
                deadlines and unresolved topics will appear
                here as we connect the AI engine.
              </p>
            </div>

            <span className="intelligence-status">
              Preparing
            </span>
          </div>
        </section>

        <aside className="participants-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">
                PARTICIPANTS
              </p>

              <h2>
                {participants.length} present
              </h2>
            </div>
          </div>

          {loadingParticipants ? (
            <p className="muted">
              Loading participants...
            </p>
          ) : participants.length === 0 ? (
            <p className="muted">
              No participants found.
            </p>
          ) : (
            <div className="participant-list">
              {participants.map((participant) => {
                const name =
                  participant.profiles?.display_name ||
                  'Participant'

                return (
                  <div
                    className="participant-item"
                    key={participant.id}
                  >
                    <div className="participant-avatar">
                      {name
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="participant-info">
                      <strong>
                        {participant.user_id ===
                        session.user.id
                          ? `${name} (You)`
                          : name}
                      </strong>

                      <span>
                        {participant.role}
                      </span>
                    </div>

                    <div className="presence-dot" />
                  </div>
                )
              })}
            </div>
          )}

          <div className="privacy-card">
            <span>Memory mode</span>

            <strong>
              {meeting.memory_mode}
            </strong>

            <p>
              Meeting data follows the selected memory
              policy.
            </p>
          </div>
        </aside>
      </div>

      <footer className="meeting-controls">
        <div className="control-group">
          <button
            className={
              microphoneEnabled
                ? 'room-control'
                : 'room-control room-control-off'
            }
            onClick={toggleMicrophone}
          >
            {microphoneEnabled
              ? 'Mute'
              : 'Unmute'}
          </button>

          <button
            className={
              cameraEnabled
                ? 'room-control'
                : 'room-control room-control-off'
            }
            onClick={toggleCamera}
          >
            {cameraEnabled
              ? 'Camera off'
              : 'Camera on'}
          </button>
        </div>

        <div className="control-group">
          {isHost ? (
            <button
              className="end-meeting-button"
              onClick={handleEndMeeting}
            >
              End meeting
            </button>
          ) : (
            <button
              className="leave-meeting-button"
              onClick={handleLeave}
            >
              Leave meeting
            </button>
          )}
        </div>
      </footer>
    </main>
  )
}

export default MeetingRoom