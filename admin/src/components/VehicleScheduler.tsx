import React, { useCallback, useEffect, useState } from 'react'
import { getDateLocale } from '@/utils/dateLocale'
import { Scheduler } from '@/components/scheduler/index'
import {
  ProcessedEvent,
  RemoteQuery,
  SchedulerRef,
} from '@/components/scheduler/types'
import * as bookcarsTypes from ':bookcars-types'
import * as helper from '@/utils/helper'
import * as BookingService from '@/services/BookingService'

interface VehicleSchedulerProps {
  suppliers: string[]
  statuses: string[]
  filter?: bookcarsTypes.Filter
  user?: bookcarsTypes.User
  language: string
}

const VehicleScheduler = (
  {
    suppliers,
    statuses,
    filter: filterFromProps,
    user,
    language,
  }: VehicleSchedulerProps
) => {
  const [filter, setFilter] = useState<bookcarsTypes.Filter>()
  const [init, setInit] = useState(true)

  const schedulerRef = React.useRef<SchedulerRef>(null)

  useEffect(() => {
    setFilter(filterFromProps)
  }, [filterFromProps])

  const fetchBookings = useCallback(async (query: RemoteQuery): Promise<ProcessedEvent[]> => {
    const emptyEvents: ProcessedEvent[] = [
      {
        event_id: '1',
        title: 'Dummy Event',
        start: new Date(1970, 0, 1),
        end: new Date(1970, 0, 2),
      }
    ]

    const dateBetween = new Date(query.end.getTime() - Math.ceil(query.end.getTime() - query.start.getTime()) / 2)
    dateBetween.setHours(10, 0, 0, 0)

    const payload: bookcarsTypes.GetBookingsPayload = {
      suppliers,
      statuses,
      filter: {
        from: query.view !== 'day' ? new Date(query.start.getFullYear(), query.start.getMonth() - 1, 1) : undefined,
        dateBetween: query.view === 'day' ? dateBetween : undefined,
        to: query.view === 'month' ? new Date(query.end.getFullYear(), query.end.getMonth() + 1, 0) : new Date(query.end.getFullYear(), query.end.getMonth() + 2, 0),
        pickupLocation: filter?.pickupLocation,
        dropOffLocation: filter?.dropOffLocation,
        keyword: filter?.keyword,
      },
      user: (user && user._id) || undefined,
    }

    const data = await BookingService.getBookings(payload, 1, 10000)
    const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecord: 0 }, resultData: [] }
    if (!_data) {
      helper.error()
      return emptyEvents
    }
    const bookings = _data.resultData

    const events = bookings.map((booking): ProcessedEvent => ({
      event_id: booking._id as string,
      title: `${(booking.car as bookcarsTypes.Car).name} / ${(booking.supplier as bookcarsTypes.User).fullName} / ${helper.getBookingStatus(booking.status)}`,
      start: new Date(booking.from),
      end: new Date(booking.to),
      color: helper.getBookingStatusBackgroundColor(booking.status),
      textColor: helper.getBookingStatusTextColor(booking.status),
    }))

    setInit(false)

    if (events.length === 0) {
      return emptyEvents
    }
    return events
  }, [filter, statuses, suppliers, user])

  useEffect(() => {
    const fetchEvents = async () => {
      schedulerRef.current?.scheduler?.handleState(fetchBookings, 'getRemoteEvents')
    }

    if (!init && statuses.length > 0 && suppliers.length > 0) {
      fetchEvents()
    }
  }, [statuses, suppliers, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const getTranslations = (_language: string) => {
    if (_language === 'fr') {
      return {
        navigation: {
          month: 'Mois',
          week: 'Semaine',
          day: 'Jour',
          today: "Aujourd'hui",
          agenda: 'Agenda',
        },
        form: {
          addTitle: 'Ajouter un événement',
          editTitle: 'Modifier un événement',
          confirm: 'Confirmer',
          delete: 'Supprimer',
          cancel: 'Annuler',
        },
        event: {
          title: 'Titre',
          subtitle: 'Sous-titre',
          start: 'Début',
          end: 'Fin',
          allDay: 'Toute la journée',
        },
        validation: {
          required: 'Obligatoire',
          invalidEmail: 'E-mail non valide',
          onlyNumbers: 'Seuls les chiffres sont autorisés',
          min: 'Minimum de {{min}} lettres',
          max: 'Maximum de {{max}} lettres',
        },
        moreEvents: 'Plus...',
        noDataToDisplay: 'Aucune donnée à afficher',
        loading: 'Chargement...',
      }
    }

    if (_language === 'es') {
      return {
        navigation: {
          month: 'Mes',
          week: 'Semana',
          day: 'Día',
          today: 'Hoy',
          agenda: 'Agenda'
        },
        form: {
          addTitle: 'Agregar evento',
          editTitle: 'Editar evento',
          confirm: 'Confirmar',
          delete: 'Eliminar',
          cancel: 'Cancelar'
        },
        event: {
          title: 'Título',
          subtitle: 'Subtítulo',
          start: 'Inicio',
          end: 'Fin',
          allDay: 'Todo el día'
        },
        validation: {
          required: 'Obligatorio',
          invalidEmail: 'Correo electrónico no válido',
          onlyNumbers: 'Solo se permiten números',
          min: 'Mínimo {{min}} letras',
          max: 'Máximo {{max}} letras'
        },
        moreEvents: 'Más...',
        noDataToDisplay: 'Sin datos para mostrar',
        loading: 'Cargando...'
      }
    }

    if (_language === 'de') {
      return {
        navigation: {
          month: 'Monat',
          week: 'Woche',
          day: 'Tag',
          today: 'Heute',
          agenda: 'Agenda',
        },
        form: {
          addTitle: 'Ereignis hinzufügen',
          editTitle: 'Ereignis bearbeiten',
          confirm: 'Bestätigen',
          delete: 'Löschen',
          cancel: 'Abbrechen',
        },
        event: {
          title: 'Titel',
          subtitle: 'Untertitel',
          start: 'Beginn',
          end: 'Ende',
          allDay: 'Ganztägig',
        },
        validation: {
          required: 'Erforderlich',
          invalidEmail: 'Ungültige E-Mail-Adresse',
          onlyNumbers: 'Nur Zahlen erlaubt',
          min: 'Mindestens {{min}} Buchstaben',
          max: 'Höchstens {{max}} Buchstaben',
        },
        moreEvents: 'Mehr...',
        noDataToDisplay: 'Keine Daten zum Anzeigen',
        loading: 'Wird geladen...',
      }
    }

    if (_language === 'pt') {
      return {
        navigation: {
          month: 'Mês',
          week: 'Semana',
          day: 'Dia',
          today: 'Hoje',
          agenda: 'Agenda',
        },
        form: {
          addTitle: 'Adicionar evento',
          editTitle: 'Editar evento',
          confirm: 'Confirmar',
          delete: 'Eliminar',
          cancel: 'Cancelar',
        },
        event: {
          title: 'Título',
          subtitle: 'Subtítulo',
          start: 'Início',
          end: 'Fim',
          allDay: 'Dia inteiro',
        },
        validation: {
          required: 'Obrigatório',
          invalidEmail: 'E-mail inválido',
          onlyNumbers: 'Apenas números são permitidos',
          min: 'Mínimo de {{min}} letras',
          max: 'Máximo de {{max}} letras',
        },
        moreEvents: 'Mais...',
        noDataToDisplay: 'Sem dados para apresentar',
        loading: 'A carregar...',
      }
    }

    if (_language === 'it') {
      return {
        navigation: {
          month: 'Mese',
          week: 'Settimana',
          day: 'Giorno',
          today: 'Oggi',
          agenda: 'Agenda',
        },
        form: {
          addTitle: 'Aggiungi evento',
          editTitle: 'Modifica evento',
          confirm: 'Conferma',
          delete: 'Elimina',
          cancel: 'Annulla',
        },
        event: {
          title: 'Titolo',
          subtitle: 'Sottotitolo',
          start: 'Inizio',
          end: 'Fine',
          allDay: 'Tutto il giorno',
        },
        validation: {
          required: 'Obbligatorio',
          invalidEmail: 'E-mail non valida',
          onlyNumbers: 'Sono ammessi solo numeri',
          min: 'Minimo {{min}} lettere',
          max: 'Massimo {{max}} lettere',
        },
        moreEvents: 'Altro...',
        noDataToDisplay: 'Nessun dato da visualizzare',
        loading: 'Caricamento...',
      }
    }

    if (_language === 'zh') {
      return {
        navigation: {
          month: '月',
          week: '周',
          day: '日',
          today: '今天',
          agenda: '日程',
        },
        form: {
          addTitle: '添加事件',
          editTitle: '编辑事件',
          confirm: '确认',
          delete: '删除',
          cancel: '取消',
        },
        event: {
          title: '标题',
          subtitle: '副标题',
          start: '开始',
          end: '结束',
          allDay: '全天',
        },
        validation: {
          required: '必填',
          invalidEmail: '电子邮件无效',
          onlyNumbers: '仅允许输入数字',
          min: '至少 {{min}} 个字符',
          max: '最多 {{max}} 个字符',
        },
        moreEvents: '更多...',
        noDataToDisplay: '没有可显示的数据',
        loading: '加载中...',
      }
    }

    if (_language === 'ja') {
      return {
        navigation: {
          month: '月',
          week: '週',
          day: '日',
          today: '今日',
          agenda: 'アジェンダ',
        },
        form: {
          addTitle: 'イベントを追加',
          editTitle: 'イベントを編集',
          confirm: '確認',
          delete: '削除',
          cancel: 'キャンセル',
        },
        event: {
          title: 'タイトル',
          subtitle: 'サブタイトル',
          start: '開始',
          end: '終了',
          allDay: '終日',
        },
        validation: {
          required: '必須',
          invalidEmail: 'メールアドレスが無効です',
          onlyNumbers: '数字のみ使用できます',
          min: '{{min}}文字以上',
          max: '{{max}}文字以下',
        },
        moreEvents: 'その他...',
        noDataToDisplay: '表示するデータがありません',
        loading: '読み込み中...',
      }
    }

    // default to english
    return {
      navigation: {
        month: 'Month',
        week: 'Week',
        day: 'Day',
        today: 'Today',
        agenda: 'Agenda',
      },
      form: {
        addTitle: 'Add Event',
        editTitle: 'Edit Event',
        confirm: 'Confirm',
        delete: 'Delete',
        cancel: 'Cancel',
      },
      event: {
        title: 'Title',
        subtitle: 'Subtitle',
        start: 'Start',
        end: 'End',
        allDay: 'All Day',
      },
      validation: {
        required: 'Required',
        invalidEmail: 'Invalid Email',
        onlyNumbers: 'Only Numbers Allowed',
        min: 'Minimum {{min}} letters',
        max: 'Maximum {{max}} letters',
      },
      moreEvents: 'More...',
      noDataToDisplay: 'No data to display',
      loading: 'Loading...',
    }
  }

  return (
    <Scheduler
      ref={schedulerRef}
      view="month"
      locale={getDateLocale(language)}
      disableViewer
      editable={false}
      draggable={false}
      agenda={false}
      onEventClick={(event: ProcessedEvent) => {
        const url = `/update-booking?b=${event.event_id}`
        window.open(url, '_blank')!.focus()
      }}
      getRemoteEvents={fetchBookings}
      translations={getTranslations(language)}
      height={window.innerHeight - (64 + 41 + 33 + 10)}
      onClickMore={(date: Date, goToDay: (d: Date) => void) => {
        goToDay(date)
      }}
    />
  )
}

export default VehicleScheduler
